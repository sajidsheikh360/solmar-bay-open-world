// HUD: health, money, wanted stars, clock, speed, objective, dialogue,
// toasts and the live minimap (player, cars, police, mission marker).
import { districtAt } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    wanted: el('wanted'),
    healthfill: el('healthfill'),
    money: el('money'),
    clock: el('clock'),
    objtext: el('objtext'),
    dialogue: el('dialogue'),
    toast: el('toast'),
    speedval: el('speedval'),
    crosshair: el('crosshair'),
    minimap: el('minimap'),
    status: el('status'),
  };
}

let toastTimer = null;
export function showToast(hud, text, ms) {
  hud.toast.textContent = text;
  hud.toast.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { hud.toast.style.display = 'none'; }, ms || 2600);
}

export function showDialogue(hud, speaker, text) {
  hud.dialogue.innerHTML = `<b>${speaker}:</b> ${text}`;
  hud.dialogue.style.display = 'block';
}

export function hideDialogue(hud) { hud.dialogue.style.display = 'none'; }

export function updateHud(hud, state) {
  const stars = Array.from({ length: 5 }, (_, i) => (i < state.wanted ? '★' : '<span class="off">★</span>')).join('');
  hud.wanted.innerHTML = stars;
  hud.healthfill.style.width = `${Math.max(0, state.health)}%`;
  hud.healthfill.style.background = state.health > 50 ? 'linear-gradient(90deg,#37d67a,#a8ff6a)' : state.health > 25 ? 'linear-gradient(90deg,#ffb347,#ffd23e)' : 'linear-gradient(90deg,#ff4444,#ff8888)';
  hud.money.textContent = `$${Math.floor(state.money).toLocaleString()}`;
  const hh = Math.floor(state.hour) % 24;
  const mm = Math.floor((state.hour % 1) * 60);
  hud.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}  •  ${districtAt(state.x, state.z)}`;
  hud.objtext.textContent = state.objective;
  hud.speedval.textContent = String(Math.round(Math.abs(state.speed) * 2.2));
  hud.crosshair.style.display = state.aiming ? 'block' : 'none';
  drawMinimap(hud.minimap, state);
}

function drawMinimap(canvas, state) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const scale = W / 420;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#123326';
  ctx.beginPath(); ctx.arc(cx, cy, W / 2, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, W / 2, 0, Math.PI * 2); ctx.clip();
  // Roads
  ctx.strokeStyle = '#3A444E';
  ctx.lineWidth = 4;
  for (let i = -4; i <= 4; i += 1) {
    const p = i * 40 * scale;
    ctx.beginPath(); ctx.moveTo(cx + p, 0); ctx.lineTo(cx + p, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy + p); ctx.lineTo(W, cy + p); ctx.stroke();
  }
  // Sea to the west
  ctx.fillStyle = '#1E7FB8';
  ctx.fillRect(0, 0, cx - 190 * scale, H);
  const dot = (x, z, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx + x * scale, cy + z * scale, r, 0, Math.PI * 2); ctx.fill();
  };
  for (const c of state.collectibles || []) if (!c.taken) dot(c.x, c.z, '#FFD23E', 2.5);
  if (state.missionTarget) dot(state.missionTarget.x, state.missionTarget.z, '#FFD23E', 6);
  if (state.taxi) dot(state.taxi.pickupX, state.taxi.pickupZ, '#2EC4FF', 4);
  for (const car of state.cars || []) dot(car.x, car.z, car.isPolice ? '#FF2222' : '#FFFFFF', car.isPolice ? 4 : 2.5);
  for (const p of state.peds || []) if (p.alive) dot(p.x, p.z, '#9DFF8F', 1.8);
  // Player: white arrow pointing along heading
  ctx.save();
  ctx.translate(cx + state.x * scale, cy + state.z * scale);
  ctx.rotate(state.angle);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2); ctx.stroke();
}
