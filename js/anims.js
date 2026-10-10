// Animations d'attaque : chaque figurine a son style (coup d'épée, flèche, souffle de feu...).
// Lancement : onglet « Jouer », figurine sélectionnée -> « ⚔ Attaquer » (ou touche A) -> clic sur la cible.
//   kind  : 'melee' = l'attaquant bondit vers la cible ; 'ranged' = un projectile part vers la cible
//   fx    : effet visuel (voir FX plus bas)       shake : tremblement de l'écran à l'impact

const ATTACKS = {
  warrior:  { kind:'melee',  fx:'slash', color:'#dfe8ff', name:"Coup d'épée",        dur:750 },
  cleric:   { kind:'melee',  fx:'smash', color:'#ffd84a', name:'Masse sacrée',       dur:900 },
  goblin:   { kind:'melee',  fx:'stab',  color:'#f4f4f4', name:'Coups de dague',     dur:700 },
  skeleton: { kind:'melee',  fx:'slash', color:'#b9e6a0', name:'Lame rouillée',      dur:750 },
  orc:      { kind:'melee',  fx:'chop',  color:'#ffffff', name:'Coup de hache',      dur:900, shake:7 },
  wolf:     { kind:'melee',  fx:'claw',  color:'#ff4a4a', name:'Morsure',            dur:700 },
  mage:     { kind:'ranged', fx:'orb',   color:'#4fd8ff', name:'Projectile magique', dur:1000 },
  ranger:   { kind:'ranged', fx:'arrow', color:'#ffe9a8', name:'Flèche',             dur:850 },
  slime:    { kind:'ranged', fx:'acid',  color:'#62d26a', name:"Crachat d'acide",    dur:900 },
  dragon:   { kind:'ranged', fx:'fire',  color:'#ff8a2a', name:'Souffle de feu',     dur:1400, shake:5 },
  kobold:   { kind:'melee',  fx:'stab',  color:'#e4c38d', name:'Pointe de lance',   dur:650 },
  rat:      { kind:'melee',  fx:'claw',  color:'#dcb49a', name:'Morsure de rat',    dur:600 },
  bat:      { kind:'melee',  fx:'claw',  color:'#c2a1db', name:'Morsure en piqué',  dur:600 },
  imp:      { kind:'ranged', fx:'acid',  color:'#b4e565', name:'Dard venimeux',     dur:800 },
  fire_beetle: { kind:'melee', fx:'smash', color:'#ffb43f', name:'Mandibules brûlantes', dur:750 },
  bandit:   { kind:'ranged', fx:'arrow', color:'#dbceb7', name:'Flèche de bandit', dur:850 },
  zombie:   { kind:'melee',  fx:'smash', color:'#9eaf7a', name:'Coup pesant',       dur:1000 },
  ghoul:    { kind:'melee',  fx:'claw',  color:'#badde4', name:'Griffes de goule',  dur:700 },
  gnoll:    { kind:'melee',  fx:'chop',  color:'#e1c08c', name:'Hache du gnoll',    dur:850, shake:3 },
  lizardfolk: { kind:'melee', fx:'stab', color:'#9cd3b2', name:'Lance reptilienne', dur:800 },
  ogre:     { kind:'melee',  fx:'smash', color:'#ceac7d', name:'Massue de l’ogre', dur:1100, shake:6 },
  troll:    { kind:'melee',  fx:'claw',  color:'#93c898', name:'Griffes du troll',  dur:950, shake:3 },
  minotaur: { kind:'melee',  fx:'chop',  color:'#e5c199', name:'Hache du labyrinthe', dur:1050, shake:6 },
  stone_golem: { kind:'melee', fx:'smash', color:'#8cdbdb', name:'Poing de pierre', dur:1200, shake:8 },
  hill_giant: { kind:'melee', fx:'smash', color:'#dac394', name:'Massue du géant', dur:1300, shake:10 },
};
const DEFAULT_ATTACK = { kind:'melee', fx:'slash', color:'#ffffff', name:'Attaque', dur:750 };
const attackOf = u => u.gearCombat?.attack || ATTACKS[u.sprite] || DEFAULT_ATTACK;

let anims = [], pops = [], areaList = [], animRaf = 0;

// Effet de zone : explosion, pluie de flèches, lumière sacrée, soins
function startAreaFx(fx) {
  if (SIM) return;
  areaList.push({ ...fx, seed: (Math.random() * 1e5) | 0, start: performance.now(), dur: fx.kind === 'heal' ? 1000 : 1400 });
  if (!animRaf) animRaf = requestAnimationFrame(animTick);
}

// res = résultat du jet ({ hit, crit, dmg }) ou null si les jets ne sont pas automatiques
function startAttack(a, t, res = null, st = null) {
  if (SIM) return;
  st ||= attackOf(a);
  anims.push({ a, t, res, st, start: performance.now(), dur: st.dur, seed: (Math.random() * 1e5) | 0 });
  if (!animRaf) animRaf = requestAnimationFrame(animTick);
}
// Texte qui s'envole au-dessus d'une figurine (dégâts, soins, états...)
function popText(u, text, color, size = 16) {
  if (SIM) return;
  if (typeof broadcast === 'function' && !u.hidden) broadcast({ type: 'pop', u: u.id, text, color, size });
  pops.push({ u, text, color, size, start: performance.now(), dur: 1300 });
  if (!animRaf) animRaf = requestAnimationFrame(animTick);
}
function animTick() {
  const now = performance.now();
  anims = anims.filter(an => now - an.start < an.dur && map.units.includes(an.a) && map.units.includes(an.t));
  pops = pops.filter(p => now - p.start < p.dur && map.units.includes(p.u));
  areaList = areaList.filter(f => now - f.start < f.dur);
  draw();
  animRaf = (anims.length || pops.length || areaList.length) ? requestAnimationFrame(animTick) : 0;
}

// ---------- Outils ----------
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeInOut = t => t < 0.5 ? 2*t*t : 1 - 2*(1 - t)*(1 - t);
const win = (p, a, b) => (p < a || p > b) ? -1 : (p - a) / (b - a);   // progression dans une fenêtre, -1 en dehors
const prog = an => clamp((performance.now() - an.start) / an.dur, 0, 1);
const hitTime = an => an.st.kind === 'melee' ? 0.42 : an.st.fx === 'fire' ? 0.4 : 0.62;
const rnd = (an, i, k = 0) => hash(an.seed + k * 977, i);

// Positions de l'attaquant et de la cible (au niveau du buste)
function animGeom(an) {
  const A = unitBox(an.a), B = unitBox(an.t);
  const ax = A.cx, ay = A.fy - A.sw*0.45, tx = B.cx, ty = B.fy - B.sw*0.45;
  const d = Math.hypot(tx - ax, ty - ay) || 1;
  return { A, B, ax, ay, tx, ty, d, ux: (tx - ax) / d, uy: (ty - ay) / d, R: B.sw * 0.45 };
}

// Décalage, éclair blanc et orientation d'une figurine pendant une attaque (lu par drawUnit)
function unitAnim(u) {
  const r = { dx: 0, dy: 0, flash: 0, flip: false };
  for (const an of anims) {
    if (an.a !== u && an.t !== u) continue;
    const p = prog(an), g = animGeom(an);
    if (an.a === u) {
      r.flip = g.ux < -0.2;   // regarde vers la cible
      if (an.st.kind === 'melee') {
        const k = p < 0.25 ? -0.3 * easeOut(p / 0.25)                        // armer
                : p < 0.42 ? -0.3 + 1.3 * easeIn((p - 0.25) / 0.17)          // bondir
                : p < 0.6 ? 1 : 1 - easeInOut((p - 0.6) / 0.4);              // revenir
        const reach = Math.min(T * 0.55, g.d * 0.45);
        r.dx += g.ux * k * reach; r.dy += g.uy * k * reach;
      } else {
        const k = p < 0.12 ? p / 0.12 : p < 0.35 ? 1 - (p - 0.12) / 0.23 : 0;   // recul au tir
        r.dx -= g.ux * k * T * 0.12; r.dy -= g.uy * k * T * 0.12 + k * T * 0.06;
      }
    }
    if (an.t === u && an.res && !an.res.hit) {   // raté : la cible esquive sur le côté
      const h = hitTime(an) - 0.12;
      if (p >= h) {
        const q = (p - h) / (1 - h), s = Math.sin(Math.min(1, q * 1.6) * Math.PI) * T * 0.3;
        r.dx += -g.uy * s; r.dy += g.ux * s * 0.5;
      }
    } else if (an.t === u) {
      const h = hitTime(an);
      if (p >= h) {
        const q = (p - h) / (1 - h), knock = Math.sin(Math.min(1, q * 2) * Math.PI) * T * 0.15;
        r.flash = Math.max(r.flash, 1 - q * 2.5);
        r.dx += g.ux * knock + Math.sin(q * 50) * (1 - q) * T * 0.05;
        r.dy += g.uy * knock * 0.5;
      }
    }
  }
  return r;
}

function screenShake() {
  let x = 0, y = 0;
  for (const an of anims) {
    if (!an.st.shake) continue;
    const p = prog(an), h = hitTime(an);
    if (p < h) continue;
    const a = an.st.shake * (1 - (p - h) / (1 - h));
    x += Math.sin(p * 97) * a; y += Math.cos(p * 71) * a;
  }
  return { x, y };
}

// ---------- Effets ----------
function sparks(c, an, x, y, q, color, n, R, k = 0) {
  c.save();
  c.strokeStyle = color; c.lineWidth = 2.5; c.globalAlpha = 1 - q; c.shadowColor = color; c.shadowBlur = 8;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rnd(an, i, k) * Math.PI * 2, r = R * (0.5 + 0.5 * rnd(an, i, k + 1)) * easeOut(q);
    c.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.4);
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
  }
  c.stroke(); c.restore();
}
// Traînée d'arme qui balaie un arc de a0 à a1
function swoosh(c, x, y, R, a0, a1, q, color, width) {
  const head = a0 + (a1 - a0) * easeOut(Math.min(1, q * 1.6));
  const tail = a0 + (a1 - a0) * Math.max(0, q * 1.6 - 0.6);
  if (Math.abs(head - tail) < 0.01) return;
  c.save();
  c.globalAlpha = 1 - Math.max(0, q - 0.6) / 0.4; c.lineCap = 'round';
  c.shadowColor = color; c.shadowBlur = 14;
  c.strokeStyle = color; c.lineWidth = width;
  c.beginPath(); c.arc(x, y, R, Math.min(head, tail), Math.max(head, tail)); c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = width * 0.35;
  c.beginPath(); c.arc(x, y, R, Math.min(head, tail), Math.max(head, tail)); c.stroke();
  c.restore();
}
function glowBall(c, x, y, r, color, alpha = 1) {
  c.save(); c.globalAlpha = alpha; c.globalCompositeOperation = 'lighter';
  const gr = c.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
  c.restore();
}
function ring(c, x, y, r, color, width, alpha, squash = 0.45) {
  c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.shadowColor = color; c.shadowBlur = 10;
  c.beginPath(); c.ellipse(x, y, r, r * squash, 0, 0, Math.PI*2); c.stroke(); c.restore();
}
// Position sur une trajectoire en cloche (projectiles) et angle de la tangente
function lob(g, k, H) {
  const x = g.ax + (g.tx - g.ax) * k, y = g.ay + (g.ty - g.ay) * k - H * 4 * k * (1 - k);
  return { x, y, ang: Math.atan2((g.ty - g.ay) - H * 4 * (1 - 2*k), g.tx - g.ax) };
}

const FX = {
  // Coup d'épée / lame : arc lumineux devant la cible
  slash(c, an, p, g) {
    const q = win(p, 0.3, 0.72), base = Math.atan2(g.uy, g.ux) + Math.PI;
    if (q >= 0) swoosh(c, g.tx, g.ty, g.R * 0.95, base - 1.4, base + 1.4, q, an.st.color, 7);
    const q2 = win(p, 0.42, 0.78);
    if (q2 >= 0) sparks(c, an, g.tx, g.ty, q2, '#ffffff', 9, g.R * 1.1);
  },
  // Coup de hache : grand arc vertical, poussière au sol
  chop(c, an, p, g) {
    const q = win(p, 0.28, 0.7), left = g.ux < 0;
    if (q >= 0) swoosh(c, g.tx, g.ty + g.R * 0.2, g.R * 1.25,
                       left ? -Math.PI * 0.1 : -Math.PI * 0.95, left ? -Math.PI * 0.95 : -Math.PI * 0.1, q, '#e8ecf4', 11);
    const q2 = win(p, 0.42, 1);
    if (q2 < 0) return;
    sparks(c, an, g.tx, g.ty, Math.min(1, q2 * 1.4), '#fff6c8', 12, g.R * 1.4);
    c.save();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = g.R * (0.4 + 1.1 * easeOut(q2));
      c.globalAlpha = 0.5 * (1 - q2); c.fillStyle = '#9a8468';
      c.beginPath(); c.ellipse(g.tx + Math.cos(a) * r, g.B.fy + Math.sin(a) * r * 0.35, 7 + 6 * q2, 4 + 3 * q2, 0, 0, Math.PI*2); c.fill();
    }
    c.restore();
  },
  // Deux coups de dague rapides
  stab(c, an, p, g) {
    [[0.33, 0.52, -0.25], [0.5, 0.7, 0.25]].forEach(([a, b, side], i) => {
      const q = win(p, a, b); if (q < 0) return;
      const px = -g.uy * g.R * side, py = g.ux * g.R * side;
      const tipX = g.tx - g.ux * g.R * 0.15 + px, tipY = g.ty - g.uy * g.R * 0.15 + py;
      const len = g.R * 1.1 * (1 - q * 0.6);
      c.save(); c.globalAlpha = 1 - q; c.lineCap = 'round';
      c.strokeStyle = an.st.color; c.lineWidth = 4; c.shadowColor = '#fff'; c.shadowBlur = 10;
      c.beginPath(); c.moveTo(tipX - g.ux * len, tipY - g.uy * len); c.lineTo(tipX, tipY); c.stroke();
      c.restore();
      sparks(c, an, tipX, tipY, q, '#ffffff', 5, g.R * 0.6, i * 7);
    });
  },
  // Masse sacrée : onde dorée et rayons de lumière
  smash(c, an, p, g) {
    const q = win(p, 0.38, 1); if (q < 0) return;
    glowBall(c, g.tx, g.ty, g.R * 1.6, an.st.color, Math.max(0, 1 - q * 2));
    ring(c, g.tx, g.B.fy, g.R * 0.4 + g.R * 1.5 * easeOut(q), an.st.color, 5 * (1 - q) + 1, 1 - q);
    c.save(); c.globalAlpha = 1 - q; c.strokeStyle = '#fff3b0'; c.lineWidth = 3; c.shadowColor = an.st.color; c.shadowBlur = 12;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + q * 0.8, r0 = g.R * (0.3 + q * 0.8), r1 = r0 + g.R * 0.7;
      c.moveTo(g.tx + Math.cos(a) * r0, g.ty + Math.sin(a) * r0); c.lineTo(g.tx + Math.cos(a) * r1, g.ty + Math.sin(a) * r1);
    }
    c.stroke();
    c.fillStyle = an.st.color; c.font = `bold ${Math.round(g.R)}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('✚', g.tx, g.ty - g.R * 1.2 - q * g.R * 0.6);
    c.restore();
  },
  // Morsure : trois griffures rouges
  claw(c, an, p, g) {
    for (let i = 0; i < 3; i++) {
      const q = win(p, 0.36 + i * 0.05, 0.9); if (q < 0) continue;
      const k = easeOut(Math.min(1, q * 3));
      const sx = g.tx - g.R * 0.55 + i * g.R * 0.4, sy = g.ty - g.R * 0.6;
      const ex = sx + g.R * 0.3 * k, ey = sy + g.R * 1.2 * k;
      c.save(); c.globalAlpha = 1 - Math.max(0, q - 0.5) * 2; c.lineCap = 'round';
      c.strokeStyle = an.st.color; c.lineWidth = 5; c.shadowColor = an.st.color; c.shadowBlur = 10;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
      c.restore();
    }
  },
  // Projectile magique : orbe avec traînée, explosion à l'impact
  orb(c, an, p, g) {
    const q = win(p, 0.12, 0.62);
    if (q >= 0) {
      for (let j = 8; j >= 0; j--) {
        const k = easeInOut(Math.max(0, q - j * 0.025));
        const wob = Math.sin(k * Math.PI * 3) * 8 * (1 - k);
        glowBall(c, g.ax + (g.tx - g.ax) * k - g.uy * wob, g.ay + (g.ty - g.ay) * k + g.ux * wob,
                 (j ? 9 : 16) * (1 - j / 10), an.st.color, j ? 0.5 * (1 - j / 9) : 1);
      }
    }
    const q2 = win(p, 0.62, 1); if (q2 < 0) return;
    glowBall(c, g.tx, g.ty, g.R * 1.8 * (0.5 + q2), an.st.color, 1 - q2);
    ring(c, g.tx, g.ty, g.R * 1.6 * easeOut(q2), an.st.color, 4 * (1 - q2) + 1, 1 - q2, 0.8);
    sparks(c, an, g.tx, g.ty, q2, '#c8f6ff', 14, g.R * 1.8);
  },
  // Flèche en cloche, plantée dans la cible
  arrow(c, an, p, g) {
    const H = Math.min(g.d * 0.22, T * 1.4), q = win(p, 0.15, 0.62);
    const drawArrow = (x, y, ang, alpha) => {
      c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang);
      c.strokeStyle = '#b08850'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-20, 0); c.lineTo(0, 0); c.stroke();
      c.fillStyle = '#dfe3ea'; c.beginPath(); c.moveTo(6, 0); c.lineTo(-2, -4); c.lineTo(-2, 4); c.closePath(); c.fill();
      c.strokeStyle = '#e74c3c'; c.lineWidth = 2; c.beginPath();
      c.moveTo(-20, 0); c.lineTo(-25, -4); c.moveTo(-20, 0); c.lineTo(-25, 4); c.stroke();
      c.restore();
    };
    if (q >= 0) {
      c.save(); c.strokeStyle = 'rgba(255,240,200,.35)'; c.lineWidth = 2; c.beginPath();
      for (let j = 0; j <= 6; j++) { const pt = lob(g, Math.max(0, q - 0.2 + j * 0.033), H); j ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y); }
      c.stroke(); c.restore();
      const pt = lob(g, q, H); drawArrow(pt.x, pt.y, pt.ang, 1);
    }
    const q2 = win(p, 0.62, 1); if (q2 < 0) return;
    const end = lob(g, 1, H);
    drawArrow(g.tx - g.ux * 6, g.ty - g.uy * 6, end.ang, 1 - q2);
    sparks(c, an, g.tx, g.ty, Math.min(1, q2 * 1.5), an.st.color, 7, g.R * 0.9);
  },
  // Crachat d'acide : boule verte en cloche, éclaboussures et flaque
  acid(c, an, p, g) {
    const H = Math.max(T * 0.8, g.d * 0.35), q = win(p, 0.12, 0.62);
    if (q >= 0) {
      for (let j = 5; j >= 0; j--) {
        const pt = lob(g, Math.max(0, q - j * 0.035), H);
        c.save(); c.globalAlpha = j ? 0.5 * (1 - j / 6) : 1; c.fillStyle = j ? '#3a9a44' : an.st.color;
        c.beginPath(); c.arc(pt.x, pt.y, j ? 4 : 7, 0, Math.PI*2); c.fill();
        if (!j) { c.fillStyle = '#d8ffd8'; c.beginPath(); c.arc(pt.x - 2, pt.y - 2, 2.2, 0, Math.PI*2); c.fill(); }
        c.restore();
      }
    }
    const q2 = win(p, 0.62, 1); if (q2 < 0) return;
    c.save();
    c.globalAlpha = 0.5 * (1 - q2); c.fillStyle = '#3a9a44';
    c.beginPath(); c.ellipse(g.tx, g.B.fy, g.R * 0.9 * easeOut(q2), g.R * 0.32 * easeOut(q2), 0, 0, Math.PI*2); c.fill();
    c.globalAlpha = 1 - q2; c.fillStyle = an.st.color;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * rnd(an, i), v = g.R * (0.8 + rnd(an, i, 1));
      c.beginPath();
      c.arc(g.tx + Math.cos(a) * v * q2, g.ty + Math.sin(a) * v * q2 + g.R * 2 * q2 * q2, 3.2 * (1 - q2 * 0.5), 0, Math.PI*2);
      c.fill();
    }
    c.restore();
  },
  // Souffle de feu : flot de particules de la gueule jusqu'à la cible, puis flammes sur la cible
  fire(c, an, p, g) {
    const mx = g.ax + g.ux * g.A.sw * 0.12, my = g.A.fy - g.A.sw * 0.72;
    const dx = g.tx - mx, dy = g.ty - my, px = -g.uy, py = g.ux, d = Math.hypot(dx, dy);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const b = 0.12 + rnd(an, i) * 0.55, age = (p - b) / 0.24;
      if (age < 0 || age > 1) continue;
      const spread = (rnd(an, i, 1) - 0.5) * 0.45 * d * age;
      const x = mx + dx * easeOut(age) * 1.05 + px * spread, y = my + dy * easeOut(age) * 1.05 + py * spread;
      c.globalAlpha = (1 - age) * 0.85;
      c.fillStyle = age < 0.25 ? '#fff2a8' : age < 0.5 ? '#ffb02e' : age < 0.8 ? '#ff5a1f' : '#8a2a1a';
      c.beginPath(); c.arc(x, y, 3 + 11 * age, 0, Math.PI*2); c.fill();
    }
    const q2 = win(p, 0.4, 1);
    if (q2 >= 0) {
      for (let i = 0; i < 14; i++) {
        const t = (q2 * 3 + rnd(an, i, 3)) % 1;
        c.globalAlpha = (1 - t) * (1 - q2 * 0.7);
        c.fillStyle = t < 0.4 ? '#ffd24a' : '#ff6a1f';
        c.beginPath(); c.arc(g.tx + (rnd(an, i, 4) - 0.5) * g.R * 1.4, g.B.fy - t * g.R * 2.2, 5 * (1 - t) + 2, 0, Math.PI*2); c.fill();
      }
    }
    c.restore();
  },
};

function floatTextSized(c, x, y, txt, color, alpha, size) {
  c.save(); c.globalAlpha = Math.max(0, alpha);
  c.font = `bold ${size}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(txt, x, y);
  c.fillStyle = color; c.fillText(txt, x, y);
  c.restore();
}
function floatText(c, x, y, txt, color, alpha) {
  c.save(); c.globalAlpha = Math.max(0, alpha);
  c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(txt, x, y);
  c.fillStyle = color; c.fillText(txt, x, y);
  c.restore();
}

// Invisible pour les joueurs : figurine cachée ou dans le brouillard
const unseen = u => playerSight() && (u.hidden || (map.fogOn && fullyFogged(u.x, u.y, u.size, u.size)));

function drawAreaFx(c, f, q) {
  const { from, to, r, color } = f, h2 = (i, k = 0) => hash(f.seed + k * 131, i);
  if (f.kind === 'blast') {
    if (q < 0.3) {
      const k = easeIn(q / 0.3);
      for (let j = 6; j >= 0; j--) { const kk = Math.max(0, k - j * 0.04);
        glowBall(c, from.x + (to.x - from.x) * kk, from.y + (to.y - from.y) * kk - Math.sin(kk * Math.PI) * 40, j ? 7 : 13, color, j ? 0.4 : 1); }
      return;
    }
    const k = (q - 0.3) / 0.7;
    glowBall(c, to.x, to.y, r * (0.5 + 0.9 * easeOut(Math.min(1, k * 2))), color, Math.max(0, 1 - k * 1.3));
    ring(c, to.x, to.y, r * easeOut(Math.min(1, k * 1.5)), color, 7 * (1 - k) + 1, 1 - k, 0.6);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const a = h2(i) * Math.PI * 2, d = r * easeOut(k) * (0.3 + 0.8 * h2(i, 1));
      c.globalAlpha = (1 - k) * 0.8; c.fillStyle = h2(i, 2) < 0.5 ? '#ffd24a' : color;
      c.beginPath(); c.arc(to.x + Math.cos(a) * d, to.y + Math.sin(a) * d * 0.6 - k * 25 * h2(i, 3), 3 + 7 * (1 - k), 0, Math.PI * 2); c.fill();
    }
    c.restore();
  } else if (f.kind === 'arrows') {
    ring(c, to.x, to.y, r, 'rgba(255,233,168,.6)', 2, 1 - q, 0.6);
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const k = clamp((q - i * 0.025) / 0.35, 0, 1); if (k <= 0) continue;
      const tx = to.x + (h2(i) - 0.5) * r * 1.6, ty = to.y + (h2(i, 1) - 0.5) * r;
      if (k < 1) { c.strokeStyle = '#d8b880'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(tx - 8, ty - 110 * (1 - k) - 18); c.lineTo(tx, ty - 110 * (1 - k)); c.stroke(); }
      else { c.globalAlpha = Math.max(0, 1 - (q - 0.5) * 2); c.strokeStyle = '#b08850'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 5, ty - 12); c.lineTo(tx, ty); c.stroke(); c.globalAlpha = 1; }
    }
    c.restore();
  } else if (f.kind === 'holy') {
    glowBall(c, to.x, to.y, r * 0.9, color, 0.6 * (1 - q));
    ring(c, to.x, to.y, r * easeOut(q), color, 4 * (1 - q) + 1, 1 - q, 0.6);
    c.save(); c.globalAlpha = 1 - q; c.fillStyle = '#fff3b0';
    for (let i = 0; i < 18; i++) { const a = h2(i) * Math.PI * 2, d = r * h2(i, 1);
      c.fillRect(to.x + Math.cos(a) * d - 1.5, to.y + Math.sin(a) * d * 0.6 - q * 50 * (0.5 + h2(i, 2)) - 1.5, 3, 3); }
    c.restore();
  } else if (f.kind === 'heal') {
    c.save(); c.globalAlpha = 1 - q; c.fillStyle = color; c.font = 'bold 14px system-ui'; c.textAlign = 'center';
    for (let i = 0; i < 12; i++) c.fillText('+', to.x + (h2(i) - 0.5) * T * 1.1, to.y - q * 50 * (0.6 + h2(i, 1)) + (h2(i, 2) - 0.5) * 20);
    c.restore();
    glowBall(c, to.x, to.y - 10, T * 0.6, color, 0.5 * (1 - q));
  }
}

function drawAnimEffects(c) {
  const now = performance.now();
  c.save();
  if(playerSight()&&map.fogOn){
    // No spell trail, blast or floating damage text may paint over opaque fog.
    c.beginPath();
    for(let y=0;y<map.rows;y++)for(let x=0;x<map.cols;x++)if(map.fog[y*map.cols+x]){
      const level=levelAt(x,y),below=y+1<map.rows?levelAt(x,y+1):0;
      c.rect(x*T,y*T-level*LH(),T,T+Math.max(0,level-below)*LH());
    }
    c.clip();
  }
  for (const f of areaList) {
    const source=map.units.find(u=>u.id===f.source);
    if(!playerSight()||(source&&!unseen(source)))drawAreaFx(c, f, (now - f.start) / f.dur);
  }
  for (const p of pops) {
    if (unseen(p.u)) continue;
    const q = (now - p.start) / p.dur, b = unitBox(p.u);
    const stack = pops.filter(o => o.u === p.u && o.start < p.start && now - o.start < 400).length;   // évite les superpositions
    c.save(); c.font = `bold ${p.size}px system-ui`;
    floatTextSized(c, b.cx, b.fy - b.sw - 4 - easeOut(q) * 34 - stack * 18, p.text, p.color, 1 - q * q, p.size);
    c.restore();
  }
  for (const an of anims) {
    if (unseen(an.a) || unseen(an.t)) continue;
    const p = prog(an), g = animGeom(an);
    (FX[an.st.fx] || FX.slash)(c, an, p, g);
    const h = hitTime(an);
    if (p >= h) {
      const q = (p - h) / (1 - h);
      floatText(c, g.tx, g.B.fy - g.B.sw - 48 - q * 14, an.st.name + ' !', an.st.color, 1 - q * q);
    }
  }
  c.restore();
}
