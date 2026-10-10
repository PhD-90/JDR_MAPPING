// Modules locaux : un geste prépare un aperçu, le relâchement applique une seule opération annulable.
const MAP_MODULES = {
  room: { name:'Salle', icon:'🏰', hint:'Glisse entre deux coins pour créer une salle avec murs et entrée. Échap annule l’aperçu.' },
  path: { name:'Chemin', icon:'〰', hint:'Glisse pour tracer un chemin. Règle son sol et sa largeur à droite. Échap annule l’aperçu.' },
  river: { name:'Rivière', icon:'🌊', hint:'Glisse pour tracer une rivière avec ses berges. Échap annule l’aperçu.' },
  scatter: { name:'Dispersion', icon:'🌲', hint:'Glisse entre deux coins pour répartir le décor dans cette zone. Échap annule l’aperçu.' }
};
let mapModule = 'room';

function moduleOptions(kind) {
  if (kind === 'room') return { floor:$('moduleRoomFloor').value, door:$('moduleDoor').value,
    doorWidth:+$('moduleDoorWidth').value, height:clamp(Math.round(+$('moduleWallHeight').value || 2), 1, 6), flat:$('moduleRoomFlat').checked };
  if (kind === 'path') return { floor:$('modulePathFloor').value, width:+$('modulePathWidth').value };
  if (kind === 'river') return { floor:'water', width:+$('moduleRiverWidth').value, banks:$('moduleRiverBanks').checked };
  return { theme:$('moduleScatterTheme').value, density:+$('moduleDensity').value / 100 };
}

function moduleFeedback(text, warning = false) {
  $('mapModuleFeedback').textContent = text;
  $('mapModuleFeedback').classList.toggle('warn', warning);
}
function syncMapModuleUI() {
  const active = tool === 'module';
  $('mapModulePanel').classList.toggle('hidden', !active);
  $('mapModuleTitle').textContent = `${MAP_MODULES[mapModule].icon} ${MAP_MODULES[mapModule].name}`;
  document.querySelectorAll('[data-map-module]').forEach(b => {
    const on = active && b.dataset.mapModule === mapModule;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('[data-module-options]').forEach(el => el.classList.toggle('hidden', el.dataset.moduleOptions !== mapModule));
  moduleFeedback('Glisse sur la carte pour voir l’aperçu. Échap pour annuler.');
}

function initMapModules() {
  for (const [id, selected] of [['moduleRoomFloor', 'tiles'], ['modulePathFloor', 'dirt']]) {
    const el = $(id); el.replaceChildren();
    Object.entries(FLOORS).forEach(([key, f]) => {
      const option = document.createElement('option'); option.value = key; option.textContent = f.name; el.append(option);
    });
    el.value = selected;
  }
  document.querySelectorAll('[data-map-module]').forEach(b => b.onclick = () => { mapModule = b.dataset.mapModule; select(null); setTool('module'); });
  $('btnModuleExit').onclick = () => setTool('select');
  $('moduleDensity').oninput = () => { $('moduleDensityValue').textContent = `${$('moduleDensity').value} %`; };
  $('moduleDoor').onchange = () => { $('moduleDoorWidth').disabled = $('moduleDoor').value === 'none'; };
}

function moduleOccupancy() {
  const occupied = new Set();
  for (const o of [...map.objects, ...map.units]) {
    const w = o.w ?? o.size, h = o.h ?? o.size;
    for (let y = o.y; y < o.y + h; y++) for (let x = o.x; x < o.x + w; x++) {
      if (inMap(x, y)) occupied.add(y * map.cols + x);
    }
  }
  return occupied;
}

// Aucun changement de la carte et aucun hasard nouveau pendant la préparation de l'aperçu.
function planMapModule(g) {
  const b = rectBounds(g.x0, g.y0, g.x1, g.y1), o = g.options;
  const plan = { cells:new Map(), levels:new Map(), objects:[], bounds:b, error:'', label:'' };
  const width = b.x1 - b.x0 + 1, height = b.y1 - b.y0 + 1;
  const object = (type, x, y, extra = {}) => ({ ...makeObj(type, x, y), id:map.nextId + plan.objects.length, ...extra });
  if (g.kind === 'room') {
    plan.label = `Salle · ${width} × ${height} cases`;
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) plan.cells.set(y * map.cols + x, o.floor);
    if (width < 4 || height < 4) { plan.error = 'La salle doit mesurer au moins 4 × 4 cases.'; return plan; }
    const occupied = moduleOccupancy();
    if ([...plan.cells.keys()].some(i => occupied.has(i))) { plan.error = 'Zone occupée : trace la salle dans une zone sans décor ni figurine.'; return plan; }
    const verticalDoor = o.door === 'west' || o.door === 'east';
    const span = verticalDoor ? height : width, start = (verticalDoor ? b.y0 : b.x0) + Math.floor((span - o.doorWidth) / 2);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
      if (o.flat) plan.levels.set(y * map.cols + x, g.level);
      const edge = x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1;
      const doorSide = (o.door === 'north' && y === b.y0) || (o.door === 'south' && y === b.y1)
        || (o.door === 'west' && x === b.x0) || (o.door === 'east' && x === b.x1);
      const along = verticalDoor ? y : x;
      if (edge && !(doorSide && along >= start && along < start + o.doorWidth)) plan.objects.push(object('wall', x, y, { e:o.height }));
    }
    return plan;
  }
  if (g.kind === 'path' || g.kind === 'river') {
    const core = new Set(), off = Math.floor((o.width - 1) / 2);
    for (const i of g.centers) {
      const cx = i % map.cols, cy = Math.floor(i / map.cols);
      for (let dy = 0; dy < o.width; dy++) for (let dx = 0; dx < o.width; dx++) {
        const x = cx - off + dx, y = cy - off + dy;
        if (inMap(x, y)) core.add(y * map.cols + x);
      }
    }
    if (o.banks) for (const i of core) {
      const x = i % map.cols, y = Math.floor(i / map.cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const bank = (y + dy) * map.cols + x + dx;
        if (inMap(x + dx, y + dy) && map.floor[bank] !== 'water') plan.cells.set(bank, 'sand');
      }
    }
    // L'eau reste prioritaire aux croisements du tracé et le long des berges.
    for (const i of core) plan.cells.set(i, o.floor);
    plan.label = `${MAP_MODULES[g.kind].name} · ${core.size} cases · largeur ${o.width}`;
    return plan;
  }
  const occupied = moduleOccupancy(), candidates = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
    const i = y * map.cols + x;
    if (occupied.has(i) || ['water', 'lava', 'void'].includes(map.floor[i])) continue;
    const rank = hash(x + g.seed, y);
    if (rank < o.density) candidates.push({ x, y, rank });
  }
  candidates.sort((a, b) => a.rank - b.rank);
  const themes={rocks:['rock'],supplies:['crate','barrel'],undergrowth:['grassTuft','flowers','mushrooms','fern','bush','pebbles'],camp:['bedroll','logs','sacks','lantern'],dungeon:['bones','chains','scrolls','candles','urn']};
  const types = themes[o.theme] || ['tree','tree','tree','rock'];
  for (const { x, y } of candidates.slice(0, 250)) {
    const r = hash(y + g.seed, x + 73), type = types[Math.floor(r * types.length)];
    plan.objects.push(object(type, x, y, { color:shade(OBJECTS[type].c, 0.9 + r * 0.2) }));
  }
  plan.label = `Dispersion · ${plan.objects.length} éléments${candidates.length > 250 ? ' (limite atteinte)' : ''}`;
  if (!plan.objects.length) plan.error = 'Aucun décor à placer : agrandis la zone, augmente la densité ou essaie une zone libre.';
  return plan;
}

function startMapModule(p) {
  if (!inMap(p.cx, p.cy)) return;
  drag = { mode:'module', kind:mapModule, x0:p.cx, y0:p.cy, x1:p.cx, y1:p.cy,
    lastX:p.cx, lastY:p.cy, options:moduleOptions(mapModule), seed:Math.floor(Math.random() * 1e6),
    level:levelAt(p.cx, p.cy), centers:new Set([p.cy * map.cols + p.cx]) };
  updateMapModule(p);
}
function updateMapModule(p) {
  const g = drag;
  const x = clamp(p.cx, 0, map.cols - 1), y = clamp(p.cy, 0, map.rows - 1);
  if (g.plan && x === g.x1 && y === g.y1) return;
  g.x1 = x; g.y1 = y;
  if (g.kind === 'path' || g.kind === 'river') strokeCells(g.lastX, g.lastY, g.x1, g.y1, (x, y) => g.centers.add(y * map.cols + x));
  g.lastX = g.x1; g.lastY = g.y1;
  g.plan = planMapModule(g);
  moduleFeedback(g.plan.error || `${g.plan.label} · Relâche pour créer.`, !!g.plan.error); redraw();
}
function commitMapModule(g) {
  const p = planMapModule(g);
  if (p.error) { moduleFeedback(p.error, true); return false; }
  if (!p.objects.length && ![...p.cells].some(([i, f]) => map.floor[i] !== f)
      && ![...p.levels].some(([i, l]) => map.height[i] !== l)) { moduleFeedback('Le tracé ne change aucune case.'); return false; }
  pushUndo();
  for (const [i, f] of p.cells) map.floor[i] = f;
  for (const [i, l] of p.levels) map.height[i] = l;
  for (const obj of p.objects) map.objects.push({ ...obj, id:map.nextId++ });
  select(null); changed(); moduleFeedback(`${p.label} · Création terminée. Ctrl+Z pour annuler.`);
  return true;
}

function drawMapModuleOverlay(c, p) {
  c.save();
  if (!p.error) {
    c.globalAlpha = .65;
    for (const o of p.objects) {
      const i = o.y * map.cols + o.x, lift = (p.levels.get(i) ?? levelAt(o.x, o.y)) * LH();
      lifted(c, lift, () => drawObj(c, o));
    }
    c.globalAlpha = 1;
  }
  if (drag.kind === 'room' || drag.kind === 'scatter') {
    const b = p.bounds;
    c.strokeStyle = p.error ? '#ff8b72' : '#a9ecc0'; c.lineWidth = 2 / cam.z; c.setLineDash([6 / cam.z, 4 / cam.z]);
    c.strokeRect(b.x0 * T, b.y0 * T - (p.levels.get(b.y0 * map.cols + b.x0) ?? levelAt(b.x0, b.y0)) * LH(),
      (b.x1 - b.x0 + 1) * T, (b.y1 - b.y0 + 1) * T);
  }
  c.restore();
}
