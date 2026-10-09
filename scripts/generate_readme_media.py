"""Capture the real app in an isolated Edge profile; rebuild README PNG/GIF/MP4.

Windows: py scripts/generate_readme_media.py
Requires Edge, Pillow, ffmpeg and ffprobe. No user saves or browser profile are used.
--only NAME captures one scene for checking; --skip-capture re-encodes existing frames.
"""
from __future__ import annotations

import argparse
import base64
import functools
import http.server
import io
import json
import os
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import tempfile
import threading
import time
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.tmp' / 'readme-media'
IMAGES = ROOT / 'docs' / 'images'
WIDTH, HEIGHT, FPS, SECONDS = 1440, 900, 12, 3


class CDP:
    """Small synchronous WebSocket client for the local DevTools endpoint."""
    def __init__(self, url):
        from urllib.parse import urlsplit
        u = urlsplit(url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=90)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\n'
                           'Upgrade: websocket\r\nConnection: Upgrade\r\n'
                           f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        header = b''
        while not header.endswith(b'\r\n\r\n'):
            header += self.sock.recv(1)
        if b' 101 ' not in header:
            raise RuntimeError(header.decode())
        self.seq = 0

    def read(self, n):
        data = b''
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                raise ConnectionError('DevTools socket closed')
            data += chunk
        return data

    def send(self, payload, opcode=1):
        mask = os.urandom(4)
        n = len(payload)
        size = bytes([0x80 | n]) if n < 126 else b'\xfe' + struct.pack('!H', n) if n < 65536 else b'\xff' + struct.pack('!Q', n)
        self.sock.sendall(bytes([0x80 | opcode]) + size + mask + bytes(v ^ mask[i % 4] for i, v in enumerate(payload)))

    def message(self):
        data = b''
        while True:
            a, b = self.read(2)
            n = b & 127
            if n == 126:
                n = struct.unpack('!H', self.read(2))[0]
            elif n == 127:
                n = struct.unpack('!Q', self.read(8))[0]
            mask = self.read(4) if b & 128 else None
            part = self.read(n)
            if mask:
                part = bytes(v ^ mask[i % 4] for i, v in enumerate(part))
            if a & 15 == 8:
                raise ConnectionError('DevTools closed')
            if a & 15 == 9:
                self.send(part, 10)
                continue
            data += part
            if a & 128:
                return json.loads(data)

    def call(self, method, **params):
        self.seq += 1
        self.send(json.dumps(dict(id=self.seq, method=method, params=params)).encode())
        while True:
            result = self.message()
            if result.get('id') == self.seq:
                if 'error' in result:
                    raise RuntimeError(result['error'])
                return result.get('result', {})

    def js(self, code):
        r = self.call('Runtime.evaluate', expression=code, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(r['exceptionDetails'])
        return r.get('result', {}).get('value')

    def screenshot(self):
        raw = self.call('Page.captureScreenshot', format='png', captureBeyondViewport=False)
        return Image.open(io.BytesIO(base64.b64decode(raw['data']))).convert('RGB')


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class CaptureServer(http.server.ThreadingHTTPServer):
    # Edge opens many parallel script requests; the Windows default backlog is too small.
    request_queue_size = 128


def run_browser(capture):
    edge = Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft/Edge/Application/msedge.exe'
    if not edge.exists():
        raise RuntimeError('Microsoft Edge was not found')
    WORK.mkdir(parents=True, exist_ok=True)
    profile = Path(tempfile.mkdtemp(prefix='edge-profile-', dir=WORK))
    server = CaptureServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    cdp = None
    with (WORK / 'edge.log').open('w', encoding='utf-8') as log:
        proc = subprocess.Popen([str(edge), '--headless', '--disable-gpu', '--no-first-run',
                                 '--no-default-browser-check', '--disable-background-networking',
                                 '--remote-debugging-port=0', f'--user-data-dir={profile}',
                                 f'--window-size={WIDTH},{HEIGHT}', 'about:blank'],
                                stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            portfile = profile / 'DevToolsActivePort'
            for _ in range(100):
                try:
                    # Edge can briefly lock the file while publishing the port on Windows.
                    port = int(portfile.read_text().splitlines()[0])
                    break
                except (OSError, ValueError, IndexError):
                    if proc.poll() is not None:
                        raise RuntimeError('Edge stopped before opening its DevTools port')
                time.sleep(.2)
            else:
                raise TimeoutError('Edge did not publish its DevTools port within 20 seconds')
            pages = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
            cdp = CDP(next(p['webSocketDebuggerUrl'] for p in pages if p['type'] == 'page'))
            cdp.call('Page.enable')
            cdp.call('Emulation.setDeviceMetricsOverride', width=WIDTH, height=HEIGHT, deviceScaleFactor=1, mobile=False)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', source="window.mediaErrors=[]; addEventListener('error',e=>mediaErrors.push(e.message||('Resource failed: '+(e.target.src||e.target.href||e.target.tagName))),true); addEventListener('unhandledrejection',e=>mediaErrors.push(String(e.reason))); ")
            base = f'http://127.0.0.1:{server.server_port}/index.html'
            cdp.call('Page.navigate', url=base)
            for _ in range(100):
                if cdp.js("document.readyState==='complete' && typeof draw==='function'"):
                    break
                time.sleep(.1)
            else:
                raise TimeoutError('Application did not finish loading')
            errors = cdp.js('mediaErrors')
            if errors:
                raise RuntimeError('Application startup errors: ' + json.dumps(errors, ensure_ascii=False))
            capture(cdp, base)
        finally:
            if cdp:
                try:
                    cdp.call('Browser.close')
                except (OSError, ConnectionError):
                    pass
                cdp.sock.close()
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                proc.terminate()
            server.shutdown()
            # tempfile returned this exact child of our dedicated workspace folder.
            if profile.resolve().parent != WORK.resolve():
                raise RuntimeError('Unexpected profile path')
            for _ in range(10):
                try:
                    shutil.rmtree(profile)
                    break
                except OSError:
                    time.sleep(.3)


def caption(image, title, subtitle, number, total):
    out = Image.new('RGB', (WIDTH, HEIGHT + 64), '#1c1713')
    out.paste(image, (0, 0))
    d = ImageDraw.Draw(out)
    d.line((0, HEIGHT, WIDTH, HEIGHT), fill='#b79555', width=2)
    fonts = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
    large = ImageFont.truetype(str(fonts / 'georgiab.ttf'), 23)
    small = ImageFont.truetype(str(fonts / 'segoeui.ttf'), 17)
    d.text((24, HEIGHT + 8), title, font=large, fill='#eddbb4')
    d.text((24, HEIGHT + 36), subtitle, font=small, fill='#c5b79b')
    d.text((WIDTH - 106, HEIGHT + 21), f'{number:02d} / {total:02d}', font=small, fill='#d8b365')
    return out


def capture_all(cdp, base, only=None):
    source = (ROOT / 'scripts/readme-scenes.js').read_text(encoding='utf-8')
    cdp.js(source)
    scenes = cdp.js('mediaScenes.map(({name,title,subtitle,animated,seconds,gif})=>({name,title,subtitle,animated:!!animated,seconds:seconds||3,gif:!!gif}))')
    if only and not any(s['name'] == only for s in scenes):
        raise ValueError('Unknown scene: ' + only)
    IMAGES.mkdir(parents=True, exist_ok=True)
    for i, scene in enumerate(scenes):
        name = scene['name']
        if only and only != name:
            continue
        print(f'Capture {i + 1}/{len(scenes)}: {name}', flush=True)
        if name == 'ecran-joueurs':
            cdp.call('Page.navigate', url=base + '?joueurs')
            time.sleep(.8)
            cdp.js(source)
        elif cdp.js("typeof PLAYER_VIEW!=='undefined' && PLAYER_VIEW"):
            cdp.call('Page.navigate', url=base)
            time.sleep(.8)
            cdp.js(source)
        cdp.js(f'prepareMediaScene({json.dumps(name)})')
        time.sleep(.15)
        cdp.js('mediaFreeze()')
        shot = cdp.screenshot()
        shot.save(IMAGES / (name + '.png'), optimize=True)
        for crop in cdp.js('mediaCrops()'):
            box = tuple(round(crop[k]) for k in ('left', 'top', 'right', 'bottom'))
            if box[2] > box[0] and box[3] > box[1]:
                shot.crop(box).save(IMAGES / (crop['name'] + '.png'), optimize=True)
        errors = cdp.js('mediaErrors')
        if errors:
            raise RuntimeError(f'{name}: {errors}')
        if scene['title']:
            frames = WORK / name
            frames.mkdir(exist_ok=True)
            count = scene['seconds'] * FPS if scene['animated'] else 1
            for f in range(count):
                subtitle = scene['subtitle']
                if scene['animated']:
                    details = cdp.js(f'mediaFrame({f / FPS})')
                    if details:
                        subtitle = details.get('subtitle', subtitle)
                    shot = cdp.screenshot()
                caption(shot, scene['title'], subtitle,
                        sum(bool(s['title']) for s in scenes[:i + 1]),
                        sum(bool(s['title']) for s in scenes)).save(frames / f'{f:04d}.png')
        if cdp.js('mediaErrors'):
            raise RuntimeError(f"{name}: {cdp.js('mediaErrors')}")
        print(f'  OK: {shot.width} x {shot.height}', flush=True)
    (WORK / 'scenes.json').write_text(json.dumps(scenes, ensure_ascii=False, indent=2), encoding='utf-8')


def ffmpeg(*args):
    # Encode separately so a failed run never truncates the previous media.
    target = Path(args[-1])
    with tempfile.NamedTemporaryFile(prefix='encode-', suffix=target.suffix, dir=WORK, delete=False) as f:
        temporary = Path(f.name)
    try:
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        *map(str, args[:-1]), str(temporary)], check=True)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


def encode():
    scenes = json.loads((WORK / 'scenes.json').read_text(encoding='utf-8'))
    clips = []
    for s in scenes:
        if not s['title']:
            continue
        name = s['name']
        print('Encode: ' + name, flush=True)
        clip = WORK / (name + '.mp4')
        args = ['-framerate', FPS, '-i', WORK / name / '%04d.png'] if s['animated'] else ['-loop', 1, '-framerate', FPS, '-i', WORK / name / '0000.png']
        ffmpeg(*args, '-t', s.get('seconds', SECONDS), '-c:v', 'libx264', '-preset', 'fast', '-crf', 22, '-pix_fmt', 'yuv420p', clip)
        clips.append(clip)
        if s.get('gif'):
            ffmpeg('-i', clip, '-vf',
                   'fps=12,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
                   '-loop', 0, IMAGES / (name + '.gif'))
    concat = WORK / 'clips.txt'
    concat.write_text(''.join(f"file '{p.name}'\n" for p in clips), encoding='utf-8')
    ffmpeg('-f', 'concat', '-safe', 0, '-i', concat, '-c', 'copy', '-movflags', '+faststart', ROOT / 'docs/visite-guidee.mp4')
    ffmpeg('-i', ROOT / 'docs/visite-guidee.mp4', '-vf',
           'fps=6,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
           '-loop', 0, ROOT / 'docs/visite-guidee.gif')
    ffmpeg('-i', WORK / 'attaques.mp4', '-vf',
           'fps=12,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
           '-loop', 0, IMAGES / 'attaques.gif')
    result = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=width,height,nb_frames,codec_name', '-of', 'json', str(ROOT / 'docs/visite-guidee.mp4')])
    print(result.decode(), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only')
    parser.add_argument('--skip-capture', action='store_true')
    args = parser.parse_args()
    if not args.skip_capture:
        run_browser(lambda cdp, base: capture_all(cdp, base, args.only))
    if not args.only:
        encode()
