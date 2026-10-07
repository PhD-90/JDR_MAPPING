// Démarrage de l'application.

function resize() {
  dpr = window.devicePixelRatio || 1;
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
  draw();
}
window.addEventListener('resize', resize);

try {
  const saved = localStorage.getItem('jdr-map');
  if (saved) { const m = JSON.parse(saved); if (m.cols && m.floor) map = normalizeMap(m); }
} catch (e) {}
initStats(); buildPalettes(); buildPlayPalettes(); setTool('object'); setMode('edit'); fit();
