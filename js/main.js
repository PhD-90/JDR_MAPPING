// Démarrage de l'application.

function resize() {
  dpr = window.devicePixelRatio || 1;
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
  draw();
}
window.addEventListener('resize', resize);

initStats();   // avant la carte : les figurines y prennent leurs PV, CA...
try {
  const saved = localStorage.getItem('jdr-map');
  if (saved) { const m = JSON.parse(saved); if (m.cols && m.floor) map = normalizeMap(m); }
} catch (e) {}
buildPalettes(); buildPlayPalettes(); initChars(); loadWorld(); setTool('object');
if (PLAYER_VIEW) { initPlayerView(); setMode('play'); } else setMode('edit');
fit();
