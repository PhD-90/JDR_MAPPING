// Simulateur : joue N fois le combat de la carte (toutes les figurines à l'IA, règles strictes, sans affichage)
// sur une copie de la carte, puis donne un rapport : victoire, durée, personnages tombés ou morts, monstres dangereux.
// La carte du MJ n'est jamais modifiée.

let simVerbose = false;   // journal détaillé pendant la simulation (désactivé : plus rapide)
let simRunning = false;

// Copie de la carte prête à être simulée
function simBase(src = map) {
  const b = normalizeMap(JSON.parse(JSON.stringify(src)));
  b.turn = 0; b.order = []; b.active = 0; b.log = []; b.fogOn = false;
  return b;
}

async function simulate(base, { n = 100, maxRounds = 20, fresh = true, seed = 1, onProgress = null } = {}) {
  const heroes = base.units.filter(u => unitKind(u) === 'hero'), monsters = base.units.filter(u => unitKind(u) === 'monster');
  if (!heroes.length || !monsters.length) throw new Error('Il faut au moins un personnage et un monstre sur la carte.');
  const R = { n, wins: 0, losses: 0, draws: 0, rounds: [], units: {}, t0: performance.now() };
  base.units.forEach(u => { R.units[u.id] = { name: u.name, kind: unitKind(u), sprite: u.sprite, down: 0, dead: 0, ko: 0, hpEnd: 0, dealt: 0, kills: 0 }; });
  const saved = { map, playSel, actionMode, attackMode };
  simRunning = true; SIM = true;
  try {
    for (let i = 0; i < n; i++) {
      if (i % 4 === 0) {   // laisse respirer l'interface (avec la vraie carte affichée)
        map = saved.map; playSel = saved.playSel; SIM = false;
        onProgress && onProgress(i / n); await new Promise(r => setTimeout(r, 0));
        SIM = true;
      }
      seedRng(seed + i * 7919);
      map = JSON.parse(JSON.stringify(base));
      map.units.forEach(u => {
        if (fresh) { u.hp = u.hpMax; u.ds = null; u.dead = false; u.stable = false; u.conds = []; u.condDur = {}; }
        u.track = NEW_TRACK(); u.ctrl = 'ia'; u.conc = null; u.wasDown = false; delete u.act; u.hidden = false;
      });
      invalidateZones();
      startCombat(true);
      let guard = 0;
      while (map.turn > 0 && map.turn <= maxRounds && !combatOver() && guard++ < 4000) {
        const u = activeUnit();
        if (u && !isKO(u)) aiTurn(u);
        if (combatOver()) break;
        advance(); beginTurn();
      }
      const heroUp = map.units.some(u => unitKind(u) === 'hero' && !isKO(u)), monUp = map.units.some(u => unitKind(u) === 'monster' && !isKO(u));
      if (heroUp && !monUp) R.wins++; else if (!heroUp) R.losses++; else R.draws++;
      R.rounds.push(Math.min(map.turn, maxRounds));
      map.units.forEach(u => {
        const s = R.units[u.id]; if (!s) return;
        s.dealt += u.track.dealt; s.kills += u.track.kos; s.hpEnd += Math.max(0, u.hp) / u.hpMax;
        if (u.wasDown) s.down++; if (u.dead) s.dead++; if (isKO(u)) s.ko++;
      });
    }
  } finally {
    SIM = false; simRunning = false;
    ({ map, playSel, actionMode, attackMode } = saved);
    seedRng(null); invalidateZones(); redraw(); syncPlayUI();
  }
  R.ms = Math.round(performance.now() - R.t0);
  return R;
}

// Verdict de difficulté d'après le taux de victoire et les pertes
function simVerdict(R) {
  const win = R.wins / R.n, heroes = Object.values(R.units).filter(u => u.kind === 'hero');
  const downRate = heroes.reduce((s, u) => s + u.down, 0) / (R.n * Math.max(1, heroes.length));
  const deathRate = heroes.reduce((s, u) => s + u.dead, 0) / (R.n * Math.max(1, heroes.length));
  if (win >= 0.97 && downRate < 0.05) return { name: 'Facile', cls: 'easy', txt: 'Le groupe gagne presque toujours sans perte.' };
  if (win >= 0.85 && downRate < 0.25) return { name: 'Moyenne', cls: 'medium', txt: 'Victoire probable, quelques blessures sérieuses.' };
  if (win >= 0.6) return { name: 'Difficile', cls: 'hard', txt: 'Le groupe gagne souvent, mais des personnages tombent.' };
  if (win >= 0.3 || deathRate < 0.3) return { name: 'Mortelle', cls: 'deadly', txt: 'Défaite fréquente : risque réel de mort.' };
  return { name: 'Massacre', cls: 'deadly', txt: 'Le groupe perd presque à chaque fois.' };
}

// ---------- Fenêtre de simulation ----------
let simSource = null;   // carte à simuler (null = carte en cours)
function openSim(src = null, title = 'Simuler ce combat') {
  simSource = src;
  $('simTitle').textContent = title;
  $('simOut').innerHTML = '<p class="muted">Toutes les figurines sont jouées par l\'IA, en règles strictes, sur une copie de la carte : ta carte n\'est pas modifiée.</p>';
  $('simModal').classList.remove('hidden');
}
$('simClose').onclick = () => { if (!simRunning) $('simModal').classList.add('hidden'); };
$('simRun').onclick = async () => {
  if (simRunning) return;
  const base = simBase(simSource || map);
  const n = clamp(+$('simN').value || 100, 10, 1000), maxRounds = clamp(+$('simRounds').value || 20, 3, 100);
  const fresh = $('simFresh').checked, seed = Math.floor(+$('simSeed').value) || 1;
  $('simOut').innerHTML = '<div class="sim-progress"><i id="simBar"></i></div><p class="muted" id="simPct">Simulation...</p>';
  $('simRun').disabled = true;
  try {
    const R = await simulate(base, { n, maxRounds, fresh, seed, onProgress: p => { $('simBar').style.width = Math.round(p * 100) + '%'; $('simPct').textContent = `Combat ${Math.round(p * n)} / ${n}`; } });
    renderSimReport(R);
  } catch (err) { $('simOut').innerHTML = `<p class="warn">${escapeHtml(err.message || err)}</p>`; }
  $('simRun').disabled = false;
};
function renderSimReport(R) {
  const v = simVerdict(R), pct = x => Math.round(x / R.n * 100);
  const avg = R.rounds.reduce((a, b) => a + b, 0) / R.n;
  const units = Object.values(R.units);
  const row = u => `<tr><td>${escapeHtml(u.name)}</td><td>${pct(u.down)} %</td><td>${pct(u.dead)} %</td><td>${Math.round(u.hpEnd / R.n * 100)} %</td><td>${Math.round(u.dealt / R.n)}</td><td>${(u.kills / R.n).toFixed(1)}</td></tr>`;
  const danger = units.filter(u => u.kind === 'monster').sort((a, b) => b.dealt - a.dealt);
  $('simOut').innerHTML = `
    <div class="sim-verdict ${v.cls}"><b>${v.name}</b><span>${v.txt}</span></div>
    <div class="sim-bar3">
      <i class="w" style="width:${pct(R.wins)}%" title="Victoires">${pct(R.wins) >= 8 ? pct(R.wins) + ' %' : ''}</i>
      <i class="d" style="width:${pct(R.draws)}%" title="Non terminés">${pct(R.draws) >= 8 ? pct(R.draws) + ' %' : ''}</i>
      <i class="l" style="width:${pct(R.losses)}%" title="Défaites">${pct(R.losses) >= 8 ? pct(R.losses) + ' %' : ''}</i>
    </div>
    <p class="sim-legend"><span class="w">■</span> victoire du groupe ${pct(R.wins)} % · <span class="d">■</span> non terminé ${pct(R.draws)} % · <span class="l">■</span> défaite ${pct(R.losses)} %</p>
    <p>⏱ ${avg.toFixed(1)} rounds en moyenne (de ${Math.min(...R.rounds)} à ${Math.max(...R.rounds)}) · ${R.n} combats en ${(R.ms / 1000).toFixed(1)} s</p>
    <table class="sim-table"><tr><th>Personnage</th><th title="Tombé à 0 PV au moins une fois">Tombé</th><th>Mort</th><th title="PV restants en fin de combat">PV fin</th><th title="Dégâts infligés par combat">Dégâts</th><th title="Ennemis mis KO par combat">KO</th></tr>
      ${units.filter(u => u.kind === 'hero').map(row).join('')}</table>
    <table class="sim-table"><tr><th>Monstre</th><th>Vaincu</th><th></th><th>PV fin</th><th>Dégâts</th><th>KO</th></tr>
      ${danger.map(u => `<tr><td>${escapeHtml(u.name)}</td><td>${pct(u.ko)} %</td><td></td><td>${Math.round(u.hpEnd / R.n * 100)} %</td><td>${Math.round(u.dealt / R.n)}</td><td>${(u.kills / R.n).toFixed(1)}</td></tr>`).join('')}</table>
    ${danger[0] ? `<p class="muted">Le plus dangereux : <b>${escapeHtml(danger[0].name)}</b> (${Math.round(danger[0].dealt / R.n)} dégâts par combat).</p>` : ''}`;
  if (typeof addHistory === 'function') addHistory('🧪 Simulation', `${v.name} : victoire ${pct(R.wins)} %, défaite ${pct(R.losses)} %, ${avg.toFixed(1)} rounds en moyenne (${R.n} combats).`);
}
$('btnSim').onclick = () => {
  if (!map.units.some(u => unitKind(u) === 'hero') || !map.units.some(u => unitKind(u) === 'monster')) { alert('Place au moins un personnage et un monstre sur la carte.'); return; }
  openSim(null, 'Simuler ce combat');
};
