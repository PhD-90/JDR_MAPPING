// Compétences (tests de caractéristique), perception passive, et pièges / passages secrets résolus automatiquement.

const SKILLS = [
  { k: 'acrobaties', name: 'Acrobaties', ab: 'dex' }, { k: 'arcanes', name: 'Arcanes', ab: 'int' },
  { k: 'athletisme', name: 'Athlétisme', ab: 'for' }, { k: 'discretion', name: 'Discrétion', ab: 'dex' },
  { k: 'dressage', name: 'Dressage', ab: 'sag' }, { k: 'escamotage', name: 'Escamotage', ab: 'dex' },
  { k: 'histoire', name: 'Histoire', ab: 'int' }, { k: 'intimidation', name: 'Intimidation', ab: 'cha' },
  { k: 'investigation', name: 'Investigation', ab: 'int' }, { k: 'medecine', name: 'Médecine', ab: 'sag' },
  { k: 'nature', name: 'Nature', ab: 'int' }, { k: 'perception', name: 'Perception', ab: 'sag' },
  { k: 'perspicacite', name: 'Perspicacité', ab: 'sag' }, { k: 'persuasion', name: 'Persuasion', ab: 'cha' },
  { k: 'religion', name: 'Religion', ab: 'int' }, { k: 'representation', name: 'Représentation', ab: 'cha' },
  { k: 'survie', name: 'Survie', ab: 'sag' }, { k: 'tromperie', name: 'Tromperie', ab: 'cha' },
];
const skillOf = k => SKILLS.find(s => s.k === k);
// Compétences maîtrisées par défaut selon la classe
const CLASS_SKILLS = { guerrier: ['athletisme', 'intimidation'], barbare: ['athletisme', 'survie'], paladin: ['athletisme', 'persuasion'],
  rodeur: ['perception', 'survie', 'discretion'], voleur: ['discretion', 'escamotage', 'acrobaties', 'perception'],
  mage: ['arcanes', 'investigation'], clerc: ['medecine', 'religion', 'perspicacite'] };

// Bonus : modificateur de la caractéristique + maîtrise si la compétence est maîtrisée.
// « who » est une figurine ({ ab, skills, prof }) ou une fiche (valeurs calculées).
function skillBonus(who, k) {
  const sk = skillOf(k); if (!sk) return 0;
  if (who.base) {   // fiche
    const d = sheetDerived(who), skills = who.skills || CLASS_SKILLS[who.cls] || [];
    return d.mod[sk.ab] + (skills.includes(k) ? d.prof : 0);
  }
  return abMod(who, sk.ab) + ((who.skills || []).includes(k) ? (who.prof || 2) : 0);
}
const passivePerception = who => 10 + skillBonus(who, 'perception');

// Test de compétence d'un groupe : chacun lance d20 + bonus ; réussite du groupe si au moins la moitié réussit
function groupCheck(list, k, dd, adv = 0) {
  const res = list.map(who => {
    const a = rollDie(20), b = rollDie(20), d = adv > 0 ? Math.max(a, b) : adv < 0 ? Math.min(a, b) : a, bonus = skillBonus(who, k);
    return { who, d, a, b, bonus, tot: d + bonus, ok: d + bonus >= dd };
  });
  return { res, ok: res.filter(r => r.ok).length * 2 >= res.length };
}

// ---------- Pièges et secrets ----------
let autoTraps = true;
try { autoTraps = localStorage.getItem('jdr-traps') !== '0'; } catch (e) {}
// Lit le DD et les dégâts dans le texte du marqueur : « Fosse à pieux, DD 13, 2d6 perforant »
function trapInfo(m) {
  const t = m.text || '', dd = +(t.match(/DD\s*(\d+)/i) || [])[1] || 12;
  const dmg = (t.match(/\d+d\d+(?:\s*[+-]\s*\d+)?/i) || ['2d6'])[0].replace(/\s/g, '');
  const type = DMG_TYPES.find(x => norm(t).includes(x)) || 'perforant';
  return { dd, dmg, type };
}
// Après le déplacement d'un personnage : perception passive pour repérer, déclenchement en marchant dessus
function checkTraps(u) {
  if (!autoTraps || unitKind(u) !== 'hero' || !map.marks || !map.marks.length) return;
  const pp = passivePerception(u);
  map.marks.forEach(m => {
    if (!['piege', 'secret', 'tresor', 'indice'].includes(m.type) || m.triggered) return;
    const d = Math.max(Math.abs(m.x - (u.x + (u.size - 1) / 2)), Math.abs(m.y - (u.y + (u.size - 1) / 2)));
    const { dd, dmg, type } = trapInfo(m);
    if (!m.found && d <= 2 && pp >= dd) {
      m.found = true;
      const what = { piege: 'un piège', secret: 'un passage secret', tresor: 'quelque chose de caché', indice: 'un indice' }[m.type];
      addLog(`👁 ${u.name} repère ${what}${m.text ? ' : ' + m.text : ''} (perception passive ${pp} contre DD ${dd})`, 'cond');
      popText(u, '👁 ' + what, '#ffe9a8', 14);
    }
    const on = m.x >= u.x && m.x < u.x + u.size && m.y >= u.y && m.y < u.y + u.size;
    if (on && m.type === 'piege' && !m.found) {
      m.triggered = true; m.found = true;
      const r = rollDice(dmg), s = rollSave(u, 'dex', dd), n = s.ok ? Math.floor(r.total / 2) : r.total;
      addLog(`⚠️ ${u.name} déclenche ${m.text || 'un piège'} ! Sauvegarde ${s.txt} contre DD ${dd} → ${s.ok ? 'moitié' : 'raté'} : ${n} dégâts ${dmgName(type)}`, 'hit');
      sfx('hit');
      applyDamage(u, n, null, false, type);
    }
  });
}

if (!PLAYER_VIEW) {
  $('autoTraps').checked = autoTraps;
  $('autoTraps').onchange = e => { autoTraps = e.target.checked; try { localStorage.setItem('jdr-traps', autoTraps ? '1' : '0'); } catch (err) {} };
}
