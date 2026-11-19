// The Solmar Bay HUD: health, money, wanted stars, clock, speed, mission
// objective, dialogue, toasts, and a live minimap drawn on a 2D canvas.
import { CITY, ROADS } from './config.js';
import { currentObjective, missionLabel } from './missions.js';

export function createHUD() {
  const el = (id) => document.getElementById(id);
  const hud = {
    healthFill: el('health-fill'),
    money: el('money'),
    stars: el('stars'),
    clock: el('clock'),
    speed: el('speed'),
    objective: el('objective'),
    dialogue: el('dialogue'),
    toastBox: el('toast'),
    minimap: el('minimap'),
    screen: el('screen'),
    screenTitle: el('screen-title'),
    screenText: el('screen-text'),
    _toastTimer: 0,
    _dialogueTimer: 0,
    _flashTimer: 0,
  };
  hud.toast = (text) => {
    hud.toastBox.textContent = text;
    hud.toastBox.style.opacity = '1';
    hud._toastTimer = 3;
  };
  hud.setDialogue = (text) => {
    hud.dialogue.textContent = text;
    hud.dialogue.style.opacity = '1';
    hud._dialogueTimer = 7;
  };
  hud.flashDamage = () => {
    hud._flashTimer = 0.35;
    document.getElementById('damage-flash').style.opacity = '0.45';
  };
  hud.showScreen = (title, text) => {
    hud.screenTitle.textContent = title;
    hud.screenText.textContent = text;
    hud.screen.style.display = 'flex';
  };
  hud.hideScreen = () => {
    hud.screen.style.display = 'none';
  };
  return hud;
}

export function updateHUD(hud, game, dt) {
  const p = game.player;
  hud.healthFill.style.width = `${Math.max(0, p.health)}%`;
  hud.healthFill.style.background = p.health > 50 ? '#3fa66a' : p.health > 25 ? '#e8c832' : '#d33a2c';
  hud.money.textContent = `$${p.money}`;
  hud.stars.textContent = '★'.repeat(p.wanted) + '☆'.repeat(5 - p.wanted);
  hud.stars.style.color = p.wanted > 0 ? '#ffd23e' : '#888888';
  const hour = Math.floor(game.clockHour);
  const minute = Math.floor((game.clockHour - hour) * 60);
  hud.clock.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}  ${game.districtName}`;
  hud.speed.textContent = p.inCar ? `${Math.round(Math.abs(p.car.speed) * 3.6)} km/h` : 'On foot';
  hud.objective.textContent = missionLabel(game.missions);
  if (hud._toastTimer > 0) {
    hud._toastTimer -= dt;
    if (hud._toastTimer <= 0) hud.toastBox.style.opacity = '0';
  }
  if (hud._dialogueTimer > 0) {
    hud._dialogueTimer -= dt;
    if (hud._dialogueTimer <= 0) hud.dialogue.style.opacity = '0';
  }
  if (hud._flashTimer > 0) {
    hud._flashTimer -= dt;
    if (hud._flashTimer <= 0) document.getElementById('damage-flash').style.opacity = '0';
  }
  drawMinimap(hud.minimap, game);
}

function drawMinimap(canvas, game) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (CITY * 2 + 40);
  const toMap = (x, z) => [(x + CITY + 20) * scale, (z + CITY + 20) * scale];
  ctx.fillStyle = '#10141c';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 5;
  for (const line of ROADS) {
    const [x1, y1] = toMap(line, -CITY - 20);
    const [x2, y2] = toMap(line, CITY + 20);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const [x3, y3] = toMap(-CITY - 20, line);
    const [x4, y4] = toMap(CITY + 20, line);
    ctx.beginPath();
    ctx.moveTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.stroke();
  }
  // Sun coins.
  ctx.fillStyle = '#e8c832';
  for (const coin of game.coins) {
    if (coin.taken) continue;
    const [x, y] = toMap(coin.pos.x, coin.pos.z);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission / taxi target.
  const objective = currentObjective(game.missions);
  const target = objective && objective.x !== undefined
    ? { x: objective.x, z: objective.z }
    : game.missions.taxi && game.missions.taxi.stage === 'ride'
      ? { x: game.missions.taxi.destX, z: game.missions.taxi.destZ }
      : game.missions.taxi
        ? { x: game.missions.taxi.x, z: game.missions.taxi.z }
        : null;
  if (target) {
    const [x, y] = toMap(target.x, target.z);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Traffic (white), police (red), player (green arrow).
  ctx.fillStyle = '#ffffff';
  for (const car of game.traffic) {
    const [x, y] = toMap(car.pos.x, car.pos.z);
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  ctx.fillStyle = '#ff4444';
  for (const car of game.policeCars) {
    const [x, y] = toMap(car.pos.x, car.pos.z);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const [px, py] = toMap(game.player.pos.x, game.player.pos.z);
  ctx.save();
  ctx.translate(px, py);
  // The arrow is drawn pointing north; rotate it to the player's heading.
  ctx.rotate(Math.PI - game.player.heading);
  ctx.fillStyle = '#3fa66a';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
