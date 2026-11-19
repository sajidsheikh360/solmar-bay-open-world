// Keyboard + mouse input for Solmar Bay. WASD/arrows move and drive,
// E enters or steals a car, F punches, click shoots, Shift runs, P pauses.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MISSION = 4;
export const ACTION_ENTER = 8;
export const ACTION_PUNCH = 16;
export const ACTION_SHOOT = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let lookDX = 0;
  let lookDY = 0;
  let pointerLocked = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') { actions |= ACTION_CONFIRM; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyM') actions |= ACTION_MISSION;
    if (e.code === 'KeyE') actions |= ACTION_ENTER;
    if (e.code === 'KeyF') actions |= ACTION_PUNCH;
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onMouseDown(e) {
    if (e.button === 0) actions |= ACTION_SHOOT;
    if (!pointerLocked && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch { /* pointer lock is optional */ }
    }
  }
  function onMouseMove(e) {
    if (pointerLocked) { lookDX += e.movementX || 0; lookDY += e.movementY || 0; }
  }
  function onLockChange() { pointerLocked = document.pointerLockElement === canvas; }
  function onBlur() { keys.clear(); }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onLockChange);

  return {
    direction() {
      let x = 0;
      let z = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return { x, z };
    },
    running() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    takeActions() { const a = actions; actions = 0; return a; },
    takeLook() { const r = { dx: lookDX, dy: lookDY }; lookDX = 0; lookDY = 0; return r; },
    isDown(code) { return keys.has(code); },
  };
}
