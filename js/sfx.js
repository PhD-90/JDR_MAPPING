// Effets sonores synthétisés (Web Audio, aucun fichier) : attaques, coups, soins, sorts, dés, tours, victoire...
// Ils sont aussi joués sur l'écran des joueurs. Bouton 🔊 dans la barre d'onglets pour couper le son.

let soundOn = true, actx = null;
try { soundOn = localStorage.getItem('jdr-sound') !== '0'; } catch (e) {}

function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
// Son simple : fréquence (glissando possible), forme d'onde, volume, durée
function tone(f0, dur, { type = 'sine', vol = 0.2, f1 = null, delay = 0 } = {}) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
// Bruit filtré : souffle, impact, crépitement
function noise(dur, { vol = 0.25, freq = 1200, q = 0.8, sweep = null, delay = 0, type = 'bandpass' } = {}) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay, len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination); src.start(t);
}

const SOUNDS = {
  swing:   () => noise(0.22, { freq: 600, sweep: 2600, vol: 0.18 }),
  hit:     () => { noise(0.12, { freq: 300, type: 'lowpass', vol: 0.5 }); tone(140, 0.15, { type: 'triangle', f1: 60, vol: 0.3 }); },
  crit:    () => { SOUNDS.hit(); tone(880, 0.25, { type: 'square', vol: 0.08, delay: 0.05 }); tone(1320, 0.3, { type: 'square', vol: 0.06, delay: 0.12 }); },
  miss:    () => noise(0.3, { freq: 1800, sweep: 500, vol: 0.12 }),
  heal:    () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, { vol: 0.09, delay: i * 0.07 })),
  magic:   () => { tone(300, 0.5, { type: 'sawtooth', f1: 1400, vol: 0.06 }); tone(1200, 0.4, { vol: 0.05, f1: 2400, delay: 0.1 }); },
  fire:    () => { noise(0.9, { freq: 400, sweep: 120, type: 'lowpass', vol: 0.45 }); tone(90, 0.7, { type: 'sawtooth', f1: 40, vol: 0.12 }); },
  arrows:  () => [0, 0.06, 0.12, 0.2].forEach(dl => noise(0.12, { freq: 2500, sweep: 900, vol: 0.12, delay: dl })),
  bless:   () => [784, 988, 1175].forEach((f, i) => tone(f, 0.6, { vol: 0.07, delay: i * 0.1 })),
  dice:    () => [0, 0.05, 0.11, 0.18, 0.24].forEach(dl => noise(0.03, { freq: 3000, q: 4, vol: 0.2, delay: dl })),
  turn:    () => { tone(660, 0.25, { vol: 0.06 }); tone(990, 0.35, { vol: 0.05, delay: 0.08 }); },
  ko:      () => tone(220, 0.6, { type: 'triangle', f1: 70, vol: 0.2 }),
  death:   () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.12, delay: i * 0.22 })),
  victory: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i === 5 ? 0.7 : 0.18, { type: 'square', vol: 0.06, delay: i * 0.14 })),
  levelup: () => [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.1, delay: i * 0.09 })),
};

function sfx(kind) {
  if (SIM) return;
  if (typeof broadcast === 'function') broadcast({ type: 'sfx', kind });
  playSfx(kind);
}
function playSfx(kind) { if (soundOn && SOUNDS[kind]) try { SOUNDS[kind](); } catch (e) {} }

function syncSoundBtn() { $('btnSound').textContent = soundOn ? '🔊' : '🔇'; $('btnSound').title = soundOn ? 'Couper le son' : 'Activer le son'; }
$('btnSound').onclick = () => {
  soundOn = !soundOn; try { localStorage.setItem('jdr-sound', soundOn ? '1' : '0'); } catch (e) {}
  syncSoundBtn(); if (soundOn) playSfx('turn');
};
// Le navigateur n'autorise le son qu'après une première interaction
window.addEventListener('pointerdown', () => audio(), { once: true });
syncSoundBtn();
