// Onglet « Personnages » : création de fiches (race, classe, caractéristiques, valeurs de combat).
// Les fiches sont gardées dans le navigateur et peuvent être posées sur la carte depuis l'onglet « Jouer ».

let sheets = [], curSheet = null, lastRolls = null;

const getSheet = id => sheets.find(s => s.id === id) || null;
function saveSheets() {
  try { localStorage.setItem('jdr-sheets', JSON.stringify(sheets)); } catch (e) {}
  renderSheetPal();
}

// Valeurs réparties selon l'ordre de priorité de la classe (meilleure valeur sur la carac. principale)
function assignByPriority(s, values) {
  const sorted = [...values].sort((a, b) => b - a), prio = (CLASSES[s.cls] || CLASSES.guerrier).prio;
  prio.forEach((k, i) => { s.base[k] = sorted[i]; });
}

// Quatre héros d'exemple au premier lancement
function exampleSheets() {
  return [['Aldric', 'humain', 'guerrier', 'warrior'], ['Lyra', 'elfe', 'rodeur', 'ranger'],
          ['Brom', 'nain', 'clerc', 'cleric'], ['Ysolde', 'gnome', 'mage', 'mage']].map(([name, race, cls, sprite], i) => {
    const s = newSheet(); s.id += i; Object.assign(s, { name, race, cls, sprite, method: 'standard' });
    assignByPriority(s, STANDARD_ARRAY); s.weapon = CLASSES[cls].arme;
    return s;
  });
}

function initChars() {
  try {
    const raw = localStorage.getItem('jdr-sheets');
    sheets = raw ? JSON.parse(raw) : exampleSheets();
    if (!raw) saveSheets();
  } catch (e) { sheets = exampleSheets(); }
  sheets.forEach(s => { s.over ||= {}; s.base ||= newSheet().base; s.items ||= { potion: 1, ration: 5, torche: 2 }; ensureEquipment(s); });
  saveSheets();
  reconcileEquipmentMap();
  renderSheetPal();
}

// ---------- Liste des fiches ----------
function renderSheetList() {
  const el = $('sheetList'); el.replaceChildren();
  if (!sheets.length) el.innerHTML = '<p class="muted">Aucune fiche pour l\'instant.</p>';
  sheets.forEach(s => {
    const d = sheetDerived(s), b = document.createElement('button');
    b.className = 'sheet-row ' + s.camp + (curSheet === s ? ' on' : '');
    const info = document.createElement('div');
    const n = document.createElement('b'); n.textContent = s.name;
    const sub = document.createElement('span'); sub.className = 'muted';
    sub.textContent = `${d.race.name} ${d.cls.name} · niv. ${d.lvl} · ${d.val.pv} PV · CA ${d.val.ca}`;
    info.append(n, sub);
    b.append(spriteIcon(s.sprite, 36), info);
    b.onclick = () => openSheet(s.id);
    el.appendChild(b);
  });
}
function renderChars() {
  if (!curSheet && sheets.length) curSheet = sheets[0];
  renderSheetList();
  $('sheetEmpty').classList.toggle('hidden', !!curSheet);
  $('sheetForm').classList.toggle('hidden', !curSheet);
  if (curSheet) fillSheetForm();
}
function openSheet(id) { curSheet = getSheet(id); lastRolls = null; renderChars(); }

// ---------- Formulaire ----------
const DERIVED = [
  { k:'pv', name:'Points de vie', icon:'❤️' }, { k:'ca', name:"Classe d'armure", icon:'🛡' },
  { k:'init', name:'Initiative', icon:'⚡', signed:true }, { k:'toucher', name:'Bonus de toucher', icon:'🎯', signed:true },
  { k:'degats', name:'Dégâts', icon:'⚔', text:true }, { k:'deplacement', name:'Déplacement (cases)', icon:'🥾' },
  { k:'portee', name:'Portée (cases)', icon:'🏹' }, { k:'saut', name:'Escalade (niveaux)', icon:'🧗' },
  { k:'nage', name:'Nage', icon:'🌊', bool:true }, { k:'vol', name:'Vol', icon:'🪽', bool:true },
];

// Construit le formulaire une fois (les valeurs sont remplies par fillSheetForm)
function buildSheetForm() {
  const sel = (id, obj) => `<select id="${id}">${Object.entries(obj).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>`;
  $('sheetForm').innerHTML = `
    <div class="page-heading">
      <span class="page-eyebrow">Archives des aventuriers</span>
      <h1>Le livre des personnages</h1>
      <p>Chaque héros a une histoire. Écris la prochaine page.</p>
    </div>
    <div class="sheet-top">
      <div class="portrait"><canvas id="shPortrait" class="px" width="16" height="16"></canvas></div>
      <div class="sheet-id">
        <input id="shName" class="sh-name" type="text" placeholder="Nom du personnage">
        <div class="sheet-fields">
          <label>Camp <select id="shCamp"><option value="hero">Personnage joueur</option><option value="monster">Ennemi / PNJ</option></select></label>
          <label>Race ${sel('shRace', RACES)}</label>
          <label>Classe ${sel('shCls', CLASSES)}</label>
          <label>Niveau <input id="shLevel" type="number" min="1" max="20"></label>
        </div>
        <div id="shDesc" class="muted"></div>
        <div class="sprite-pick" id="shSprites"></div>
      </div>
    </div>

    <h3>Caractéristiques</h3>
    <div class="method-bar">
      <button data-method="points">Répartition de points (27)</button>
      <button data-method="standard">Tableau standard</button>
      <button data-method="roll">🎲 Lancer 4d6</button>
      <span id="shPoints" class="points"></span>
    </div>
    <div id="shRolls" class="muted"></div>
    <div class="abilities" id="shAbilities">
      ${ABILITIES.map(a => `
        <div class="ability" data-ab="${a.k}">
          <div class="ab-name" title="${a.name}">${a.short}<span>${a.name}</span></div>
          <div class="ab-mod" id="mod_${a.k}"></div>
          <div class="ab-score" id="score_${a.k}"></div>
          <div class="ab-base"><button data-step="-1">−</button><b id="base_${a.k}"></b><button data-step="1">+</button></div>
          <div class="ab-race" id="race_${a.k}"></div>
        </div>`).join('')}
    </div>

    <h3>Combat <span class="muted">calculé automatiquement, modifiable</span> <button id="shResetOver" class="mini">↺ Recalculer</button></h3>
    <div class="derived" id="shDerived">
      ${DERIVED.map(d => `
        <label class="dcard" data-k="${d.k}"><span class="dname">${d.icon} ${d.name}</span>
          ${d.bool ? `<input type="checkbox" id="dv_${d.k}">` : `<input id="dv_${d.k}" type="${d.text ? 'text' : 'number'}">`}
          <span class="dcalc" id="dc_${d.k}"></span></label>`).join('')}
      <div class="dcard static"><span class="dname">🎓 Maîtrise</span><b id="shProf"></b><span class="dcalc">selon le niveau</span></div>
    </div>
    <div id="shArmor" class="muted"></div>

    <h3>Progression</h3>
    <div class="derived">
      <label class="dcard"><span class="dname" id="shXpLabel">⭐ Expérience (XP)</span><input id="shXp" type="number" min="0"><span class="dcalc" id="shXpNext"></span></label>
      <label class="dcard"><span class="dname">❤️ PV actuels</span><input id="shHp" type="number" min="0"><span class="dcalc" id="shHpInfo"></span></label>
      <label class="dcard"><span class="dname">💰 Pièces d'or</span><input id="shGold" type="number" min="0"><span class="dcalc"></span></label>
      <div class="dcard static prog-actions">
        <button id="shLevelUp" class="primary">⬆ Monter de niveau</button>
        <div class="row"><button id="shShort" title="1 heure : dés de vie et capacités de repos court">☕ Repos court</button>
          <button id="shRest" title="PV, capacités et dés de vie">🛏 Repos long</button></div>
      </div>
    </div>
    <div class="xpbar"><i id="shXpBar"></i></div>
    <div id="shRestOut" class="muted"></div>

    <h3>Capacités <span class="muted">utilisations restantes · 🌙 repos long · ☕ repos court · ⟳ par tour</span></h3>
    <div id="shActs" class="sh-acts"></div>
    <div id="shHd" class="muted"></div>

    <h3>Compétences <span class="muted">cochées = maîtrisées · perception passive <b id="shPP"></b></span></h3>
    <div id="shSkills" class="sh-skills"></div>

    <section id="equipmentPanel" aria-label="Équipement et inventaire"></section>

    <h3>Notes de personnage</h3>
    <label class="wide">Surnom de l’arme / ancienne attaque <input id="shWeapon" type="text"></label>
    <div class="two-col">
      <div><div class="muted">🎒 Notes d’inventaire (texte libre conservé)</div><textarea id="shInv" rows="5" placeholder="Souvenirs, objets narratifs, anciens équipements..."></textarea></div>
      <div><div class="muted">📝 Notes</div><textarea id="shNotes" rows="5" placeholder="Historique, sorts, traits, liens..."></textarea></div>
    </div>

    <div class="sheet-actions">
      <button id="shPlace" class="primary">➕ Placer sur la carte</button>
      <button id="shSync">↻ Mettre à jour les figurines sur la carte</button>
      <button id="shDup">⧉ Dupliquer</button>
      <button id="shDel" class="danger">🗑 Supprimer</button>
    </div>`;

  // sélecteur de figurine
  Object.keys(SPRITES).forEach(k => {
    const b = document.createElement('button'); b.dataset.spr = k; b.title = SPRITES[k].name;
    b.appendChild(spriteIcon(k, 32));
    b.onclick = () => edit(s => { s.sprite = k; });
    $('shSprites').appendChild(b);
  });

  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  on('shName', 'input', e => edit(s => { s.name = e.target.value || 'Sans nom'; }, false));
  on('shCamp', 'change', e => edit(s => { s.camp = e.target.value; }));
  on('shRace', 'change', e => edit(s => { s.race = e.target.value; }));
  on('shCls', 'change', e => edit(s => {
    const old = CLASSES[s.cls];
    if (s.sprite === old.sprite) s.sprite = CLASSES[e.target.value].sprite;   // suit la classe si on ne l'a pas changée
    if (!s.weapon || s.weapon === old.arme) s.weapon = CLASSES[e.target.value].arme;
    s.cls = e.target.value;
    if(s.gearAuto && s.gear?.length === (GEAR_START[Object.keys(CLASSES).find(k=>CLASSES[k]===old)]||[]).length) {
      delete s.gear;delete s.equipment;ensureEquipment(s);
    }
  }));
  on('shLevel', 'input', e => edit(s => { s.level = clamp(Math.floor(+e.target.value || 1), 1, 20); }, false));
  on('shWeapon', 'input', e => edit(s => { s.weapon = e.target.value; }, false));
  on('shNotes', 'input', e => edit(s => { s.notes = e.target.value; }, false));
  on('shInv', 'input', e => edit(s => { s.inventory = e.target.value; }, false));
  on('shXp', 'input', e => edit(s => { s.xp = Math.max(0, Math.floor(+e.target.value || 0)); }, false));
  on('shGold', 'input', e => edit(s => { s.gold = Math.max(0, Math.floor(+e.target.value || 0)); }, false));
  on('shHp', 'input', e => edit(s => { s.hpCur = e.target.value === '' ? null : clamp(Math.floor(+e.target.value), 0, +sheetDerived(s).val.pv); }, false));
  on('shLevelUp', 'click', () => edit(s => {
    if (!canLevelUp(s)) return;
    const before = +sheetDerived(s).val.pv, oldActs = unitActions(sheetUnit(s));
    s.level++; s.hd = (s.hd ?? s.level - 1) + 1;
    const gain = +sheetDerived(s).val.pv - before;
    s.hpCur = s.hpCur === null || s.hpCur === undefined ? null : s.hpCur + gain;
    const fresh = unitActions(sheetUnit(s)).filter(k => !oldActs.includes(k)).map(k => `${ACTIONS[k].icon} ${ACTIONS[k].name}`);
    const extra = MARTIAL.includes(s.cls) && s.level === 5 ? ['⚔ Attaque supplémentaire (2 attaques par action)'] : [];
    $('shRestOut').textContent = `⬆ Niveau ${s.level} : +${gain} PV max` + (fresh.length || extra.length ? ` · Nouveau : ${[...fresh, ...extra].join(', ')}` : '');
    sfx('levelup');
  }));
  const restSheet=kind=>{
    if(map.turn>0||curSheet.dead){$('shRestOut').textContent=curSheet.dead?'Ce personnage est décédé.':'Termine le combat avant de prendre un repos.';return;}
    pushUndo();edit(s=>{if(kind==='long'){longRest(s);$('shRestOut').textContent=`🛏 ${s.name} récupère ses PV, ses capacités et des dés de vie.`;}else $('shRestOut').textContent='☕ '+shortRest(s);});
    changed();syncPlayUI();
  };
  on('shRest', 'click', () => restSheet('long'));
  on('shShort', 'click', () => restSheet('short'));

  // caractéristiques : boutons − / +
  $('shAbilities').addEventListener('click', e => {
    const step = +e.target.dataset.step; if (!step) return;
    const k = e.target.closest('.ability').dataset.ab;
    edit(s => {
      const v = s.base[k] + step;
      if (s.method === 'points') {
        if (v < 8 || v > 15) return;
        const test = { ...s.base, [k]: v }, cost = pointCost(test);
        if (cost === null || cost > POINT_BUDGET) return;
      } else if (v < 3 || v > 18) return;
      s.base[k] = v;
    });
  });
  document.querySelectorAll('[data-method]').forEach(b => b.onclick = () => edit(s => {
    const m = b.dataset.method; lastRolls = null;
    if (m === 'points') { s.method = 'points'; if (pointCost(s.base) === null || pointCost(s.base) > POINT_BUDGET) ABILITIES.forEach(a => s.base[a.k] = 8); }
    if (m === 'standard') { s.method = 'standard'; assignByPriority(s, STANDARD_ARRAY); }
    if (m === 'roll') {
      s.method = 'roll';
      const r = ABILITIES.map(() => roll4d6());
      lastRolls = r.sort((a, b) => b.value - a.value);
      assignByPriority(s, r.map(x => x.value));
    }
  }));

  // valeurs de combat modifiables
  DERIVED.forEach(d => on('dv_' + d.k, d.bool ? 'change' : 'input', e => edit(s => {
    const calc = sheetDerived(s).calc[d.k];
    let v = d.bool ? e.target.checked : d.text ? e.target.value.trim() : (e.target.value === '' ? '' : +e.target.value);
    if (v === '' || v === calc) delete s.over[d.k]; else s.over[d.k] = v;
  }, false)));
  on('shResetOver', 'click', () => edit(s => { s.over = {}; }));

  on('shPlace', 'click', () => {
    const id = curSheet.id; setMode('play'); setPending('sheet:' + id);
    $('attackHint').textContent = `Clique sur la carte pour poser ${curSheet.name}`;
    $('attackHint').classList.remove('hidden'); setTimeout(() => $('attackHint').classList.add('hidden'), 2500);
  });
  on('shSync', 'click', () => {
    const us = map.units.filter(u => u.sheetId === curSheet.id); if (!us.length) return;
    pushUndo(); us.forEach(u => { applySheet(u, curSheet); u.baseName = curSheet.name; });
    changed(); fillSheetForm();
  });
  on('shDup', 'click', () => {
    const c = JSON.parse(JSON.stringify(curSheet)); c.id = newSheet().id; c.name += ' (copie)';
    rekeyEquipment(c);
    sheets.splice(sheets.indexOf(curSheet) + 1, 0, c); saveSheets(); openSheet(c.id);
  });
  on('shDel', 'click', () => {
    if (!confirm(`Supprimer la fiche « ${curSheet.name} » ? (les figurines déjà posées restent sur la carte)`)) return;
    sheets = sheets.filter(s => s !== curSheet); curSheet = sheets[0] || null; saveSheets(); renderChars();
  });
}

// Modifie la fiche courante puis sauvegarde ; full = reconstruire aussi les champs de saisie
function edit(fn, full = true) {
  if (!curSheet) return;
  fn(curSheet); saveSheets(); renderSheetList();
  fillSheetForm(full);
}

function fillSheetForm(full = true) {
  if (!$('shName')) buildSheetForm();
  const s = curSheet, d = sheetDerived(s), set = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v; };
  set('shName', s.name); set('shCamp', s.camp); set('shRace', s.race); set('shCls', s.cls); set('shLevel', s.level);
  set('shWeapon', s.weapon || ''); set('shNotes', s.notes || ''); set('shInv', s.inventory || '');
  // progression
  const hero = s.camp !== 'monster', xp = s.xp || 0, maxHp = +d.val.pv;
  set('shXp', xp); set('shGold', s.gold || 0); set('shHp', s.hpCur ?? maxHp);
  $('shXpLabel').textContent = hero ? '⭐ Expérience (XP)' : '⭐ XP rapportée si vaincu';
  const next = XP_LEVELS[s.level] ?? null, prev = XP_LEVELS[s.level - 1] || 0;
  $('shXpNext').textContent = !hero ? `par défaut ${50 * s.level}` : next === null ? 'niveau maximum' : `niveau ${s.level + 1} à ${next.toLocaleString('fr-FR')} XP`;
  $('shXpBar').style.width = hero && next ? clamp((xp - prev) / (next - prev) * 100, 0, 100) + '%' : '0%';
  $('shXpBar').parentElement.classList.toggle('hidden', !hero);
  $('shLevelUp').classList.toggle('hidden', !hero); $('shLevelUp').disabled = !canLevelUp(s);
  $('shLevelUp').textContent = canLevelUp(s) ? `⬆ Passer niveau ${s.level + 1}` : '⬆ Monter de niveau';
  $('shHpInfo').textContent = `sur ${maxHp}` + ((s.hpCur ?? maxHp) < maxHp ? ' · blessé' : '');
  // capacités : utilisations restantes (les verrouillées indiquent le niveau requis)
  const su = sheetUnit(s), acts = $('shActs'); acts.replaceChildren();
  allActions(su).forEach(k => {
    const A = ACTIONS[k], locked = (A.minLvl || 1) > s.level, max = usesMax(su, k), left = s.uses?.[k] ?? max;
    const rest = { long: '🌙', court: '☕', tour: '⟳', recharge: '🎲' }[A.rest] || '';
    const el = document.createElement('div'); el.className = 'sh-act' + (locked ? ' locked' : ''); el.title = A.desc;
    el.textContent = locked ? `🔒 ${A.name} — niveau ${A.minLvl}` : `${A.icon} ${A.name} ${rest} ${left}/${max}${A.cost === 'bonus' ? ' · action bonus' : ''}`;
    acts.appendChild(el);
  });
  if (MARTIAL.includes(s.cls)) acts.appendChild(Object.assign(document.createElement('div'), { className: 'sh-act' + (s.level < 5 ? ' locked' : ''),
    textContent: s.level >= 5 ? '⚔ Attaque supplémentaire : 2 attaques par action' : '🔒 Attaque supplémentaire — niveau 5' }));
  $('shHd').textContent = `Dés de vie : ${s.hd ?? s.level} / ${s.level} (d${d.cls.de}) · sauvegardes maîtrisées : ${(SAVE_PROF[s.cls] || []).map(k => AB_NAME[k]).join(', ')}`;
  // compétences
  const known = s.skills || CLASS_SKILLS[s.cls] || [], sk = $('shSkills'); sk.replaceChildren();
  SKILLS.forEach(k => {
    const l = document.createElement('label'); l.className = 'sh-skill' + (known.includes(k.k) ? ' on' : '');
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: known.includes(k.k) });
    cb.onchange = () => edit(x => { const cur = new Set(x.skills || CLASS_SKILLS[x.cls] || []); cb.checked ? cur.add(k.k) : cur.delete(k.k); x.skills = [...cur]; });
    l.append(cb, ` ${k.name} `, Object.assign(document.createElement('b'), { textContent: fmtMod(skillBonus(s, k.k)) }),
      Object.assign(document.createElement('span'), { className: 'muted', textContent: ` ${AB_NAME[k.ab]}` }));
    sk.appendChild(l);
  });
  $('shPP').textContent = passivePerception(s);
  renderEquipment(s);
  $('shDesc').textContent = `${d.race.desc} ${d.cls.desc} Dé de vie d${d.cls.de}, attaque sur ${d.cls.atk.toUpperCase()}.`;
  const pc = $('shPortrait').getContext('2d'); pc.clearRect(0, 0, 16, 16); pc.drawImage(spriteCanvas(s.sprite), 0, 0);
  document.querySelectorAll('#shSprites button').forEach(b => b.classList.toggle('on', b.dataset.spr === s.sprite));

  // caractéristiques
  document.querySelectorAll('[data-method]').forEach(b => b.classList.toggle('on', b.dataset.method === s.method));
  const cost = pointCost(s.base);
  $('shPoints').textContent = s.method === 'points' ? `Points restants : ${POINT_BUDGET - (cost ?? 0)} / ${POINT_BUDGET}` : '';
  $('shRolls').textContent = lastRolls ? 'Jets (4d6, on garde les 3 meilleurs) : ' +
    lastRolls.map(r => `${r.value} [${r.rolls.join(',')}]`).join(' · ') : s.method === 'standard' ? 'Valeurs 15, 14, 13, 12, 10, 8 réparties selon la classe.' : '';
  ABILITIES.forEach(({ k }) => {
    $('base_' + k).textContent = s.base[k];
    $('score_' + k).textContent = d.score[k];
    $('mod_' + k).textContent = fmtMod(d.mod[k]);
    $('mod_' + k).className = 'ab-mod ' + (d.mod[k] > 0 ? 'pos' : d.mod[k] < 0 ? 'neg' : '');
    $('race_' + k).textContent = d.race.bonus[k] ? `${fmtMod(d.race.bonus[k])} ${d.race.name}` : '';
    document.querySelector(`[data-ab="${k}"]`).classList.toggle('main', d.cls.atk === k || d.cls.prio[0] === k);
  });

  // valeurs de combat
  DERIVED.forEach(dd => {
    const inp = $('dv_' + dd.k), over = s.over[dd.k] !== undefined, calc = d.calc[dd.k];
    if (dd.bool) inp.checked = !!d.val[dd.k];
    else if (document.activeElement !== inp) inp.value = d.val[dd.k];
    inp.closest('.dcard').classList.toggle('over', over);
    $('dc_' + dd.k).textContent = over ? `calculé : ${dd.bool ? (calc ? 'oui' : 'non') : dd.signed ? fmtMod(calc) : calc}`
      : dd.k === 'deplacement' ? `${fmtLevel(d.val.deplacement * 1.5)} m` : dd.signed ? fmtMod(d.val[dd.k]) : '';
    if (dd.k === 'degats') inp.classList.toggle('invalid', !validDice(d.val.degats));
  });
  $('shProf').textContent = fmtMod(d.prof);
  $('shArmor').textContent = d.equipment.explanation;
  const n = map.units.filter(u => u.sheetId === s.id).length;
  $('shSync').disabled = !n;
  $('shSync').textContent = `↻ Mettre à jour les figurines sur la carte (${n})`;
}

// ---------- Boutons de la liste ----------
$('btnNewSheet').onclick = () => {
  const s = newSheet(); s.weapon = CLASSES[s.cls].arme;
  sheets.push(s); saveSheets(); openSheet(s.id);
  $('shName').focus(); $('shName').select();
};
$('btnSheetsExport').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(sheets, null, 2)], { type: 'application/json' }));
  download('personnages-jdr.json', url); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('btnSheetsImport').onclick = () => $('sheetsIn').click();
$('sheetsIn').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const list = JSON.parse(await f.text());
    if (!Array.isArray(list)) throw 0;
    list.forEach(s => { if (!s.base || !s.cls) throw 0; s.over ||= {}; if (getSheet(s.id)) s.id = newSheet().id; rekeyEquipment(s); sheets.push(s); });
    saveSheets(); openSheet(list[0]?.id);
  } catch { alert('Fichier de personnages invalide'); }
  e.target.value = '';
};
