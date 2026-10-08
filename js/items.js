// Objets utilisables en jeu (potions, antidote, parchemin...), inventaire chiffré des fiches et boutique des villes.

const ITEMS = {
  potion:        { name: 'Potion de soins', icon: '🧪', price: 50, heal: '2d4+2', cost: 'bonus', desc: 'Rend 2d4+2 PV (action bonus).' },
  potion_sup:    { name: 'Potion de soins supérieure', icon: '⚗️', price: 150, heal: '4d4+4', cost: 'bonus', desc: 'Rend 4d4+4 PV (action bonus).' },
  antidote:      { name: 'Antidote', icon: '💊', price: 50, cure: 'poison', cost: 'bonus', desc: 'Guérit l\'empoisonnement (action bonus).' },
  parchemin_feu: { name: 'Parchemin de boule de feu', icon: '📜', price: 300, spell: 'boule_feu', cost: 'action', desc: 'Lance une boule de feu (action), à usage unique.' },
  ration:        { name: 'Rations (1 jour)', icon: '🍞', price: 1, desc: 'Une ration consommée par jour de voyage.' },
  torche:        { name: 'Torche', icon: '🔦', price: 1, desc: 'Éclaire pendant une heure.' },
  corde:         { name: 'Corde (15 m)', icon: '🪢', price: 1, desc: 'Corde de chanvre.' },
};
// Marchandises selon le type de lieu
const SHOP = { village: ['potion', 'antidote', 'ration', 'torche', 'corde'], ville: Object.keys(ITEMS), port: Object.keys(ITEMS), capitale: Object.keys(ITEMS) };

const itemCount = (u, k) => (u.items && u.items[k]) || 0;
const usableItems = u => Object.keys(u.items || {}).filter(k => itemCount(u, k) > 0 && (ITEMS[k]?.heal || ITEMS[k]?.cure || ITEMS[k]?.spell));

// Utilise un objet en combat ; un parchemin passe par le ciblage de son sort
function useItem(u, k) {
  const it = ITEMS[k]; if (!it || itemCount(u, k) <= 0 || isKO(u)) return false;
  if (it.spell) { useAction(u, it.spell, k); return true; }
  if (!spend(u, it.cost || 'bonus')) return false;
  pushUndo();
  u.items[k]--;
  if (it.heal) {
    const r = rollDice(it.heal);
    addLog(`${it.icon} ${u.name} boit ${it.name.toLowerCase()} ${r.detail}`, 'heal'); sfx('heal');
    areaFx(u, unitCenter(u), 0.6, 'heal', '#5be37a'); heal(u, r.total);
  } else if (it.cure) {
    removeCond(u, it.cure);
    addLog(`${it.icon} ${u.name} prend un antidote : plus empoisonné`, 'heal'); popText(u, '💊 guéri', '#9ae0a0', 14);
  }
  changed(); syncPlayUI();
  return true;
}

// Prix selon la réputation du groupe dans le royaume (−5 % par point, +5 % par point négatif)
function priceAt(k, loc) {
  const reg = loc && typeof regionAt === 'function' && WT ? regionAt(loc.x, loc.y) : null;
  return Math.max(1, Math.round(ITEMS[k].price * (1 - 0.05 * ((reg && reg.rep) || 0))));
}
function buyItem(s, k, loc) {
  const p = priceAt(k, loc);
  if ((s.gold || 0) < p) { alert(`${s.name} n'a pas assez d'or (${s.gold || 0} po pour ${p} po).`); return false; }
  s.gold -= p; s.items ||= {}; s.items[k] = (s.items[k] || 0) + 1;
  saveSheets();
  if (world) { world.journal.unshift({ day: world.day, text: `🛒 ${s.name} achète ${ITEMS[k].name.toLowerCase()} pour ${p} po à ${loc ? loc.name : 'la boutique'}.` }); saveWorld(); }
  return true;
}
