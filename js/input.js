// Gestion de la souris et du clavier.

// ---------- Souris ----------
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  const p = toWorld(e);
  if (e.button === 1 || (e.button === 0 && (spaceDown || PLAYER_VIEW))) {
    drag = { mode:'pan', sx:e.clientX, sy:e.clientY, cx:cam.x, cy:cam.y }; e.preventDefault(); return;
  }
  if (PLAYER_VIEW) return;
  if (mode === 'play') { playMouseDown(e, p); return; }
  if (tool === 'module') {
    if (e.button === 0) startMapModule(p);
    else if (e.button === 2) { drag = null; moduleFeedback('Tracé annulé.'); redraw(); }
    return;
  }
  // relief : clic gauche monte, clic droit descend ; glisser aplanit au même niveau
  if (tool === 'relief' && (e.button === 0 || e.button === 2)) {
    if (!inMap(p.cx, p.cy)) return;
    pushUndo();
    const target = clamp(levelAt(p.cx, p.cy) + (e.button === 0 ? 1 : -1), 0, MAX_LEVEL);
    drag = { mode:'relief', target, lastX:p.cx, lastY:p.cy }; paintLevel(p.cx, p.cy, target); changed();
    return;
  }
  if (e.button === 2) {
    const o = hitObj(p.wx, p.wy);
    if (o) { pushUndo(); removeObj(o); changed(); }
    drag = { mode:'rerase', saved:!!o }; return;
  }
  if (e.button !== 0) return;

  if (tool === 'floor') {
    if (!inMap(p.cx, p.cy)) return;
    pushUndo(); paintFloor(p.cx, p.cy); drag = { mode:'paint', lastX:p.cx, lastY:p.cy }; changed();
  } else if (tool === 'fill') {
    if (fillFloor(p.cx, p.cy)) changed();
  } else if (tool === 'rect') {
    if (!inMap(p.cx, p.cy)) return;
    drag = { mode:'rect', x0:p.cx, y0:p.cy, x1:p.cx, y1:p.cy }; redraw();
  } else if (tool === 'erase') {
    const o = hitObj(p.wx, p.wy);
    if (o) { pushUndo(); removeObj(o); changed(); }
    drag = { mode:'erase', saved:!!o };
  } else if (tool === 'object') {
    if (!inMap(p.cx, p.cy)) return;
    pushUndo(); const o = addObj(curObj, p.cx, p.cy); select(o);
    drag = { mode:'place', lastX:p.cx, lastY:p.cy }; changed();
  } else if (tool === 'select') {
    // poignée de redimensionnement
    if (sel) {
      const hx = (sel.x + sel.w)*T, hy = (sel.y + sel.h)*T - objLift(sel), hs = 10 / cam.z;
      if (Math.abs(p.wx - hx) < hs && Math.abs(p.wy - hy) < hs) { pushUndo(); drag = { mode:'resize' }; return; }
    }
    const o = hitObj(p.wx, p.wy);
    select(o);
    if (o) { pushUndo(); drag = { mode:'move', ox:o.x, oy:o.y, sx:p.cx, sy:p.cy, moved:false }; }
    redraw();
  }
});

window.addEventListener('mousemove', e => {
  if (e.target === cv) { const p = toWorld(e); hover = inMap(p.cx, p.cy) ? p : null; }
  if (!drag) { redraw(); return; }
  if (drag.mode === 'pan') {
    cam.x = drag.cx + e.clientX - drag.sx; cam.y = drag.cy + e.clientY - drag.sy; redraw(); return;
  }
  if (e.target !== cv) return;
  const p = toWorld(e);
  if (mode === 'play') { playMouseMove(p); return; }
  if (drag.mode === 'module') { updateMapModule(p); }
  else if (drag.mode === 'rect') {
    drag.x1 = clamp(p.cx, 0, map.cols - 1); drag.y1 = clamp(p.cy, 0, map.rows - 1); redraw();
  }
  else if (['relief', 'paint'].includes(drag.mode) && inMap(p.cx, p.cy)) {
    if (p.cx === drag.lastX && p.cy === drag.lastY) return;
    strokeCells(drag.lastX, drag.lastY, p.cx, p.cy,
      drag.mode === 'paint' ? paintFloor : (x, y) => paintLevel(x, y, drag.target));
    drag.lastX = p.cx; drag.lastY = p.cy; changed();
  }
  else if (drag.mode === 'erase' || drag.mode === 'rerase') {
    const o = hitObj(p.wx, p.wy);
    if (o) { if (!drag.saved) { pushUndo(); drag.saved = true; } removeObj(o); changed(); }
  }
  else if (drag.mode === 'place' && OBJECTS[curObj].shape === 'wall' && inMap(p.cx, p.cy)) {
    // glisser pour tracer des murs
    if (p.cx === drag.lastX && p.cy === drag.lastY) return;
    strokeCells(drag.lastX, drag.lastY, p.cx, p.cy, (x, y) => {
      if (!map.objects.some(o => o.type === curObj && o.x === x && o.y === y)) addObj(curObj, x, y);
    });
    drag.lastX = p.cx; drag.lastY = p.cy; changed();
  }
  else if (drag.mode === 'move' && sel) {
    sel.x = clamp(drag.ox + p.cx - drag.sx, 0, map.cols - sel.w);
    sel.y = clamp(drag.oy + p.cy - drag.sy, 0, map.rows - sel.h);
    changed(); syncSelUI();
  }
  else if (drag.mode === 'resize' && sel) {
    sel.w = clamp(Math.round(p.wx / T) - sel.x, 1, map.cols - sel.x);
    sel.h = clamp(Math.round((p.wy + objLift(sel)) / T) - sel.y, 1, map.rows - sel.y);
    changed(); syncSelUI();
  }
});
window.addEventListener('mouseup', () => {
  if (drag && drag.mode === 'unit' && mode === 'play') playDrop(playSel, drag.from);
  if (drag && drag.mode === 'rect' && mode === 'edit') {
    pushUndo(); paintRect(drag.x0, drag.y0, drag.x1, drag.y1); changed();
  }
  if (drag && drag.mode === 'module' && mode === 'edit') commitMapModule(drag);
  drag = null; redraw();
});
window.addEventListener('blur', () => {
  if (drag && drag.mode === 'unit' && mode === 'play') playDrop(playSel, drag.from);
  if (drag?.mode === 'module') moduleFeedback('Tracé annulé.');
  drag = null; spaceDown = false; cv.style.cursor = 'crosshair'; redraw();
});
cv.addEventListener('mouseleave', () => { hover = null; redraw(); });

cv.addEventListener('wheel', e => {
  e.preventDefault();
  const f = Math.exp(-e.deltaY * 0.0015), nz = clamp(cam.z * f, 0.2, 4);
  cam.x = e.offsetX - (e.offsetX - cam.x) * nz / cam.z;
  cam.y = e.offsetY - (e.offsetY - cam.y) * nz / cam.z;
  cam.z = nz; redraw();
}, { passive:false });

// ---------- Clavier ----------
window.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || ['chars', 'world', 'gm'].includes(mode) || PLAYER_VIEW) return;
  if (e.code === 'Space') { spaceDown = true; cv.style.cursor = 'grab'; e.preventDefault(); }
  const key = e.key.toLowerCase(), command = e.ctrlKey || e.metaKey;
  if (command && (key === 'z' || key === 'y')) {
    e.preventDefault(); if (key === 'y' || e.shiftKey) redo(); else undo(); return;
  }
  if (mode === 'play') { playKey(e); return; }
  if (command && key === 'd') { e.preventDefault(); duplicate(); }
  else if (command || e.altKey) return;
  else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { pushUndo(); removeObj(sel); changed(); }
  else if (e.key.toLowerCase() === 'r' && sel) rotate();
  else if (e.key === 'Escape') {
    if (drag?.mode === 'module') { drag = null; moduleFeedback('Tracé annulé.'); redraw(); }
    else if (drag?.mode === 'rect') { drag = null; redraw(); }
    else { select(null); setTool('select'); }
  }
  else if ({ v:'select', b:'floor', g:'fill', u:'rect', e:'erase' }[key]) {
    e.preventDefault(); setTool({ v:'select', b:'floor', g:'fill', u:'rect', e:'erase' }[key]);
  }
  else if (key === 'i' && hover) {
    curFloor = map.floor[hover.cy * map.cols + hover.cx]; setTool('floor'); markPal();
  }
  else if (sel && e.key.startsWith('Arrow')) {
    e.preventDefault(); pushUndo();
    const d = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[e.key];
    sel.x = clamp(sel.x + d[0], 0, map.cols - sel.w); sel.y = clamp(sel.y + d[1], 0, map.rows - sel.h);
    changed(); syncSelUI();
  }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; cv.style.cursor = 'crosshair'; } });
