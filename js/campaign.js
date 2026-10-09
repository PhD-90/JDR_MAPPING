// Campagne hors combat : événements de voyage (rencontres, découvertes, voyageurs, météo), vivres,
// journal de quêtes, réputation par royaume, marché des villes, repos court et long du groupe.

const BIOME_PRESET = { forest: 'forest', rainforest: 'forest', jungle: 'forest', taiga: 'snow', tundra: 'snow', snow: 'snow', peak: 'snow',
                       desert: 'desert', savanna: 'desert', beach: 'desert', swamp: 'swamp', mountain: 'cave', hills: 'plain', grass: 'plain', steppe: 'plain' };
const BIOME_CLIMATE = { desert: 'chaud', savanna: 'chaud', jungle: 'humide', swamp: 'humide', rainforest: 'humide', taiga: 'froid', tundra: 'froid', snow: 'froid', peak: 'froid', mountain: 'froid' };

// ---------- Voyages : vivres et événements ----------
// Appelé à chaque voyage : chaque jour, 1 chance sur 5 d'événement ; une rencontre interrompt le voyage.
// Chaque personnage mange une ration par jour de route. Renvoie { out, stop, days } (stop = lieu de la rencontre).
function travelEvents(list, from, to, days) {
  const out = [], party = expeditionHeroes(list), options=expeditionOptions();
  let stop = null, traveled = days;
  for (let d = 1; options.events && d <= days; d++) {
    if (Math.random() > 0.2) continue;
    const k = d / (days + 1), x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k;
    if (WT.t.water[wIdx(x, y)]) continue;
    const biome = biomeAt(x, y), env = BIOME_PRESET[biome.k] || 'plain', r = Math.random();
    if (r < 0.4 && party.length) {
      const p = partyInfo(), enc = genEncounter(ENV[env] ? env : 'plain', 1 + Math.floor(Math.random() * 2), party.length, p.lvl);
      world.pending = { enc, biome: biome.k, x, y, ids: party.map(s => s.id), day: world.day + d };
      out.push(`⚔ Jour ${world.day + d} : rencontre en ${biome.name.toLowerCase()} — ${encText(enc)} ! Le voyage s'interrompt.`);
      stop = { x, y }; traveled = d;
      break;
    } else if (r < 0.6) {
      const t = genTreasure(Math.max(1, partyInfo().lvl)), share = Math.floor(t.gold / Math.max(1, party.length));
      party.forEach(s => { s.gold = (s.gold || 0) + share; });
      storeLoot(t);
      out.push(`💰 Jour ${world.day + d} : découverte en chemin, ${t.gold} po (${share} chacun)${t.items.length ? ' et ' + t.items[0] : ''}.`);
    } else if (r < 0.8) {
      const n = genNPC();
      out.push(`🧑 Jour ${world.day + d} : rencontre de ${n.name} (${n.job}), qui raconte : ${genRumor().text}`);
    } else {
      const w = genWeather(BIOME_CLIMATE[biome.k] || 'tempere', 'printemps');
      out.push(`🌦 Jour ${world.day + d} : ${w.text.replace(/\n/g, ' — ')}`);
    }
  }
  // vivres : une ration par jour de route
  if(options.chestRations){
    const plan=expeditionRations(party,traveled);applyExpeditionRations(plan);
    if(plan.used)out.push(`🍞 ${plan.used} rations prises dans le coffre commun pour le voyage.`);
    saveEquipment();
  }
  party.forEach(s => {
    s.items ||= {};
    const have = expeditionCount(s.items.ration), eat = Math.min(have, traveled), miss = traveled - eat;
    s.items.ration = have - eat;
    if (miss > 0) {
      const max = +sheetDerived(s).val.pv, hp = s.hpCur ?? max, after = hp>0?Math.max(1, hp - miss * 2):0;
      s.hpCur = after;
      out.unshift(`🍞 ${s.name} manque de vivres (${miss} jour${miss > 1 ? 's' : ''}) : ${after - hp} PV (${after}/${max}).`);
    }
  });
  saveSheets();
  party.forEach(syncExpeditionSheet);
  return { out, stop, days: traveled };
}
// Rencontre du voyage : carte générée selon le terrain, groupe à gauche, monstres en face
function fightPending() {
  const pe = world.pending; if (!pe) return;
  pushUndo();
  map = newMap(22, 14); syncMapUI();
  applyPreset(BIOME_PRESET[pe.biome] || 'plain');
  setMode('play');
  pe.ids.map(getSheet).filter(Boolean).forEach((s, i) => {
    invalidateZones(); const sp = freeSpot(2 + (i % 2) * 2, 4 + (i >> 1) * 2, SPRITES[s.sprite].size);
    if (sp) addUnit('sheet:' + s.id, sp[0], sp[1]);
  });
  invalidateZones(); spawnEncounter(pe.enc, false);
  addLog(`⚔ Rencontre en chemin (${(BIOMES.find(b => b.k === pe.biome) || {}).name || ''}) : ${encText(pe.enc)}`, 'round');
  world.pending = null; saveWorld();
  fit(); changed(); syncPlayUI();
}

// ---------- Repos du groupe ----------
// Repos court (1 h) : dés de vie pour récupérer des PV, capacités « repos court » ; repos long : tout.
function shortRest(s, dice) {
  if(s.dead)return `${s.name} ne peut pas se reposer`;
  const d = sheetDerived(s), max = +d.val.pv, de = d.cls.de;
  s.hd ??= s.level;
  let hp = s.hpCur ?? max, used = 0, gained = 0;
  const limit=dice===undefined?Infinity:expeditionCount(dice);
  while (hp < max && s.hd > 0 && used<limit && (dice!==undefined||max - hp >= de / 2)) { const g = Math.max(1, rollDie(de) + d.mod.con),before=hp; hp = Math.min(max, hp + g); gained += hp-before; s.hd--; used++; }
  s.hpCur = hp >= max ? null : hp;
  const u = sheetUnit(s); resetUses(u, 'court'); s.uses = u.uses;
  syncExpeditionSheet(s);
  return used ? `${s.name} dépense ${used} dé${used > 1 ? 's' : ''} de vie : +${gained} PV` : `${s.name} se repose`;
}
function longRest(s) {
  if(s.dead)return;
  rechargeGear(s);
  s.hpCur = null; s.hd = Math.min(s.level, (s.hd ?? s.level) + Math.max(1, Math.floor(s.level / 2)));
  const u = sheetUnit(s); resetUses(u, 'long'); s.uses = u.uses;
  syncExpeditionSheet(s);
}
// Pseudo-figurine d'une fiche (pour les capacités)
function sheetUnit(s) { const d = sheetDerived(s); return { cls: s.cls, lvl: s.level, mod: d.mod[d.cls.prio[0]], sprite: s.sprite, uses: { ...(s.uses || {}) } }; }

// ---------- Quêtes ----------
function addQuest(q) {
  nbEnsureWorld();
  world.quests ||= [];
  const entry=normalizeQuest({...q,id:nbId(),status:'active',day:world.day});
  world.quests.unshift(entry);
  saveWorld(true); return entry;
}
function questPanel() {
  const qs = (world.quests || []).filter(q=>!q.archived);
  return h('div', {},
    h('h2', { textContent: `📜 Quêtes (${qs.filter(q => q.status === 'active').length} en cours)` }),
    nbButton('📖 Gérer les quêtes',()=>openNotebook('quests'),{className:'wide-btn'}),
    qs.length ? h('div', {}, qs.map(q => {
      const loc = world.locations.find(l => l.id === q.locId);
      return h('div', { className: 'quest ' + q.status },
        h('div', { className: 'quest-top' },
          h('b', { textContent: { active: '❗', done: '✔', failed: '✖' }[q.status] + ' ' + q.title }),
          loc ? h('button', { className: 'mini', textContent: '📍', title: 'Voir le lieu', on: { click: () => { wsel = { loc, ids: new Set() }; centerOn(loc.x, loc.y); renderWorldPanels(); } } }) : null),
        h('div', { className: 'muted', textContent: q.text }),
        h('div', { className:'nb-progress',textContent:[questDeadline(q),q.objectives?.length?`${q.objectives.filter(x=>x.done).length}/${q.objectives.length} objectifs accomplis`:''].filter(Boolean).join(' · ') }),
        nbButton('✎ Ouvrir dans le carnet',()=>openNotebook('quests',q.id),{className:'mini'}),
        q.status === 'active' ? h('div', { className: 'row' },
          h('button', { className: 'mini', textContent: '✔ Réussie', disabled:(q.objectives||[]).some(x=>!x.done), on: { click: () => finishQuest(q, true) } }),
          h('button', { className: 'mini', textContent: '✖ Échouée', on: { click: () => finishQuest(q, false) } })) :
          h('button', { className: 'mini', textContent: 'Archiver', on: { click: () => { q.archived=true; saveWorld(); renderWorldPanels(); } } }));
    })) : h('p', { className: 'muted', textContent: 'Aucune quête. Crée-en dans le carnet ou avec le générateur des Outils MJ.' }));
}
// Quête réussie : l'or de la récompense est partagé, la réputation du royaume monte
function finishQuest(q, ok) {
  if(!world?.quests?.includes(q)||q.status!=='active'||(ok&&(q.objectives||[]).some(x=>!x.done)))return false;
  q.status = ok ? 'done' : 'failed';
  q.completedDay=world.day;
  const loc = world.locations.find(l => l.id === q.locId), reg = loc ? regionAt(loc.x, loc.y) : null;
  let txt = `${ok ? '✔ Quête réussie' : '✖ Quête échouée'} : ${q.title}`;
  if (ok) {
    const gold=nbInt(q.rewardGold??legacyQuestGold(q)),xp=nbInt(q.rewardXP),party=sheets.filter(s=>s.camp!=='monster'&&!s.dead);
    const share=party.length?Math.floor(gold/party.length):0,remainder=gold-share*party.length;
    preserveQuestRewardsInHistory(party,share,xp,remainder);
    party.forEach(s=>{s.gold=(s.gold||0)+share;s.xp=(s.xp||0)+xp;});
    equipmentState.chest.gold+=remainder;saveEquipment();saveSheets();
    txt+=` — ${share} po et ${xp} XP par personnage (${party.length} bénéficiaire${party.length>1?'s':''})`;
    if(remainder)txt+=` ; ${remainder} po au coffre commun`;
  }
  if (reg) { reg.rep = clamp((reg.rep || 0) + (ok ? 1 : -1), -5, 5); txt += ` — réputation ${reg.name} : ${fmtMod(reg.rep)}`; }
  q.settlement=txt;world.journal.unshift({ day: world.day, text: txt });
  saveWorld(true); if(mode==='world'){renderWorldPanels();wredraw();}
  if(mode==='gm'){renderNotebookList();renderNotebookDetail();} return true;
}
function drawQuestMarks(c) {
  const z = wcam.z;
  (world.quests || []).filter(q => q.status === 'active'&&!q.archived).forEach(q => {
    const l = world.locations.find(x => x.id === q.locId); if (!l) return;
    const x = l.x * WCELL, y = l.y * WCELL - 20 / z, bob = Math.sin(performance.now() / 300) * 2 / z;
    c.font = `bold ${16 / z}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.lineWidth = 3 / z; c.strokeStyle = '#000'; c.fillStyle = '#ffd23c';
    c.strokeText('❗', x, y + bob); c.fillText('❗', x, y + bob);
  });
  if (world.pending) {
    const x = world.pending.x * WCELL, y = world.pending.y * WCELL;
    c.font = `${18 / z}px "Segoe UI Emoji", system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('⚔️', x, y);
  }
}

// ---------- Réputation ----------
const repFace = r => r >= 3 ? '😀' : r >= 1 ? '🙂' : r <= -3 ? '😠' : r <= -1 ? '🙁' : '😐';
function repControls(reg) {
  const set = d => { reg.rep = clamp((reg.rep || 0) + d, -5, 5); saveWorld(); renderWorldPanels(); };
  return h('span', { className: 'rep' },
    h('button', { className: 'mini', textContent: '−', on: { click: e => { e.stopPropagation(); set(-1); } } }),
    h('span', { textContent: `${repFace(reg.rep || 0)} ${fmtMod(reg.rep || 0)}`, title: 'Réputation du groupe : prix −5 % par point' }),
    h('button', { className: 'mini', textContent: '+', on: { click: e => { e.stopPropagation(); set(1); } } }));
}

// ---------- Marché ----------
function shopSection(l) {
  return equipmentShop(l);
}
