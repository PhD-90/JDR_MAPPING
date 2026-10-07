// Sauvegarde, chargement et export PNG.

function download(name, href) { const a = document.createElement('a'); a.download = name; a.href = href; a.click(); }
$('btnNew').onclick = () => {
  if (!confirm('Créer une nouvelle carte ? (la carte actuelle sera effacée)')) return;
  pushUndo(); map = newMap(20, 14); select(null); playSel = null; syncPlayUI(); syncMapUI(); fit(); changed();
};
$('btnSave').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(map)], { type:'application/json' }));
  download('map-jdr.json', url); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('btnLoad').onclick = () => $('fileIn').click();
$('fileIn').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const m = JSON.parse(await f.text());
    if (!m.cols || !m.floor) throw 0;
    pushUndo(); map = normalizeMap(m); select(null); playSel = null; syncPlayUI(); syncMapUI(); fit(); changed();
  } catch { alert('Fichier invalide'); }
  e.target.value = '';
};
$('btnPng').onclick = () => {
  // marge en haut pour ce qui dépasse : relief + éléments + personnages
  const maxL = map.height.reduce((a, b) => Math.max(a, b), 0) + map.objects.reduce((a, o) => Math.max(a, o.e), 0);
  const pad = Math.ceil(maxL * LH() + (map.units.length ? T*2.2 : 0)) + 20;
  const c = document.createElement('canvas');
  c.width = map.cols*T; c.height = map.rows*T + pad;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#16181d'; x.fillRect(0, 0, c.width, c.height);
  x.translate(0, pad); renderMap(x, false);
  download('map-jdr.png', c.toDataURL('image/png'));
};
