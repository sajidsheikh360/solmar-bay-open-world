// Solmar Bay — boot and the one loop. Third-person open world: walk, drive,
// steal cars, dodge traffic, outrun the police and finish five story missions.
// ?seed=N fixes the city. ?shot=cover|chase|mission|night stages a scene,
// paints it and sets window.__shotReady for a screenshot.
import * as THREE from 'three';
import { STEP, SAVE_KEY, PLAYER, MISSIONS, districtAt } from './config.js';
import { createCity } from './city.js';
import { createTraffic, driveCar, updateTraffic, nearestCar, createCar } from './vehicles.js';
import { createPedestrians, updatePedestrians, makePedMesh } from './pedestrians.js';
import { createPolice, addWanted, updatePolice } from './police.js';
import { createMissions, startMission, missionStep, missionObjectiveText, updateMissions, nextDialogue } from './missions.js';
import { createCombat, punch, shoot } from './combat.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MISSION, ACTION_ENTER, ACTION_PUNCH, ACTION_SHOOT } from './input.js';
import { createHud, updateHud, showToast, showDialogue, hideDialogue } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const menu = document.getElementById('menu');
const statusEl = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = createCity(scene, seed);
const audio = createAudio();
const input = createInput(canvas);
const hud = createHud();
const combat = createCombat();
const missions = createMissions();
const police = createPolice(scene);
const trafficCars = createTraffic(seed);
for (const c of trafficCars) scene.add(c.mesh);
const peds = createPedestrians(scene, seed);

// The player, Mara Voss, on foot.
const playerMesh = makePedMesh(0xD7263D);
playerMesh.scale.set(1.15, 1.15, 1.15);
scene.add(playerMesh);
const player = {
  x: -120, z: 120, angle: 0, camYaw: 0, health: PLAYER.health, money: 500,
  inCar: false, car: null, speed: 0, wanted: 0, hour: 10, alive: true,
};

let screen = 'title'; // title | play | paused | over | busted
// Read-only hook for play-testing (position, health, wanted, mission state).
window.__solmar = { player, missions, police, trafficCars, peds, scene, camera, city, renderer };
let cameraYaw = 0;
let cameraPitch = 0.32;
let saveTimer = 0;
let ramCooldown = 0;
let shotFired = false;

function announce(message) { statusEl.textContent = message; }

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: player.money, missionIndex: missions.index, health: player.health,
      x: player.x, z: player.z, hour: player.hour, completed: missions.completedCount,
    }));
  } catch { /* storage can be off */ }
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function applySave(s) {
  if (!s) return;
  player.money = s.money ?? 500;
  player.health = s.health ?? 100;
  player.x = s.x ?? -120;
  player.z = s.z ?? 120;
  player.hour = s.hour ?? 10;
  missions.index = Math.min(s.missionIndex ?? 0, MISSIONS.length);
  missions.completedCount = s.completed ?? 0;
}

function setMenu(html) {
  menu.innerHTML = `<div class="card">${html}</div>`;
  menu.style.display = 'flex';
}
function hideMenu() { menu.style.display = 'none'; }

function startGame(fromSave) {
  if (fromSave) applySave(loadSave());
  audio.unlock();
  audio.startMusic();
  hideMenu();
  screen = 'play';
  announce('Playing Solmar Bay. Press M to start a mission.');
  showToast(hud, fromSave ? 'Welcome back to Solmar Bay' : 'Welcome to Solmar Bay — press M for your first mission');
}

function endGame(kind) {
  screen = kind; // 'over' (wasted) or 'busted'
  saveGame();
  const title = kind === 'busted' ? 'BUSTED' : 'WASTED';
  const line = kind === 'busted'
    ? 'Inspector Hale\'s officers caught Mara. The Bay Bank job will have to wait.'
    : 'Mara is down. Solmar Bay is not done with her yet.';
  setMenu(`<h1>${title}</h1><h2>${line}</h2><p>Money: $${Math.floor(player.money)} &nbsp;•&nbsp; Missions finished: ${missions.completedCount} of 5</p><p><button id="retrybtn">↻ Try Again</button></p><p class="keys">Your progress was saved — Continue brings you back.</p>`);
  const btn = document.getElementById('retrybtn');
  if (btn) btn.addEventListener('click', () => { player.health = 100; player.wanted = 0; police.wanted = 0; player.x = -120; player.z = 120; startGame(true); });
  announce(`${title}. Press R or click Try Again.`);
}

function enterCar() {
  if (player.inCar) {
    // Get out beside the car.
    const car = player.car;
    car.driver = null;
    car.speed = 0;
    player.inCar = false;
    player.car = null;
    player.x = car.x + Math.cos(car.angle) * 3;
    player.z = car.z - Math.sin(car.angle) * 3;
    playerMesh.visible = true;
    showToast(hud, 'Out of the car');
    return;
  }
  const car = nearestCar([...trafficCars, ...police.cars], player.x, player.z, 8);
  if (!car) { showToast(hud, 'No car close enough — walk to a parked car'); return; }
  if (car.isPolice) { showToast(hud, 'That is a police car — steal it and they will all come for you!'); }
  player.inCar = true;
  player.car = car;
  car.driver = 'player';
  playerMesh.visible = false;
  audio.unlock();
  if (car.driver === 'player') {
    addWanted(police, 1, scene);
    showToast(hud, 'Car stolen! Wanted level up — lose the police!');
    audio.siren(true);
  }
}

function movePlayer(dt, dir) {
  const run = input.running();
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const sin = Math.sin(cameraYaw);
  const cos = Math.cos(cameraYaw);
  // WASD is relative to the camera: W is away from the camera.
  const mx = (-dir.x * cos - dir.z * sin) * -1;
  const mz = (dir.x * sin - dir.z * cos) * -1;
  const len = Math.hypot(mx, mz);
  if (len < 0.01) { player.speed = 0; return; }
  const nx = player.x + (mx / len) * speed * dt;
  const nz = player.z + (mz / len) * speed * dt;
  let blocked = false;
  for (const c of city.colliders) {
    if (nx > c.minX - 0.8 && nx < c.maxX + 0.8 && nz > c.minZ - 0.8 && nz < c.maxZ + 0.8) { blocked = true; break; }
  }
  if (!blocked) {
    // Keep the player inside the built city, not the empty land beyond it.
    player.x = Math.max(-185, Math.min(185, nx));
    player.z = Math.max(-185, Math.min(185, nz));
  }
  player.angle = Math.atan2(mx, mz);
  player.speed = speed;
  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.rotation.y = player.angle;
  const swing = Math.sin(performance.now() / 90) * 0.5;
  playerMesh.userData.legL.rotation.x = swing;
  playerMesh.userData.legR.rotation.x = -swing;
}

function onMissionEvent(kind, data) {
  if (kind === 'step') { showToast(hud, `Next: ${data}`); audio.pickup(); }
  if (kind === 'taxi') { showToast(hud, data); }
  if (kind === 'wanted') { addWanted(police, data, scene); audio.siren(true); }
  if (kind === 'complete') {
    player.money += data.reward;
    showToast(hud, `Mission complete: ${data.title} — +$${data.reward}!`, 4000);
    showDialogue(hud, data.giver, 'Job done, Mara. The Bay is yours — for now.');
    audio.cash();
    saveGame();
    if (missions.index >= MISSIONS.length) {
      showToast(hud, 'All five story missions complete! You own Solmar Bay.', 5000);
    }
  }
}

function update(dt) {
  if (screen !== 'play') return;
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  ramCooldown = Math.max(0, ramCooldown - dt);
  player.hour = (player.hour + dt / 90) % 24;
  city.updateSun(player.hour);
  const look = input.takeLook();
  cameraYaw -= look.dx * 0.003;
  cameraPitch = Math.max(0.08, Math.min(0.9, cameraPitch + look.dy * 0.002));

  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    screen = 'paused';
    setMenu('<h1>PAUSED</h1><h2>Solmar Bay waits for no one — except now.</h2><p><button id="resumebtn">▶ Resume</button></p><p class="keys">WASD move/drive • E car • Click shoot • F punch • M mission</p>');
    const b = document.getElementById('resumebtn');
    if (b) b.addEventListener('click', () => { hideMenu(); screen = 'play'; });
    return;
  }
  if (actions & ACTION_MISSION) {
    if (!missions.active) {
      const m = startMission(missions, (line, who) => showDialogue(hud, who, line));
      if (m) { showToast(hud, `Mission: ${m.title}`); audio.pickup(); }
      else showToast(hud, 'No more missions — free roam!');
    } else {
      nextDialogue(missions, (line, who) => showDialogue(hud, who, line));
    }
  }
  if (actions & ACTION_ENTER) enterCar();
  if (actions & ACTION_PUNCH && !player.inCar) {
    if (punch(player, peds, police, (kind) => { addWanted(police, 1, scene); audio.punch(); })) showToast(hud, 'Punch landed!');
  }
  if (actions & ACTION_SHOOT && !player.inCar) {
    shotFired = true;
    shoot(combat, camera, peds, police.cars, player, (kind) => {
      addWanted(police, kind === 'police' ? 2 : 1, scene);
      audio.shoot();
      audio.siren(true);
    });
  }

  const dir = input.direction();
  if (player.inCar && player.car) {
    driveCar(player.car, dir, dt, city.colliders, () => { audio.crash(); addWanted(police, 0, scene); });
    player.x = player.car.x;
    player.z = player.car.z;
    player.angle = player.car.angle;
    player.speed = player.car.speed;
    audio.setEngine(Math.abs(player.car.speed) / 30, true);
  } else {
    movePlayer(dt, dir);
    audio.setEngine(0, false);
  }

  updateTraffic(trafficCars, dt, city.colliders);
  updatePedestrians(peds, dt, player, shotFired);
  shotFired = false;
  updatePolice(police, dt, player, scene, () => endGame('busted'), () => {
    if (ramCooldown <= 0) {
      ramCooldown = 1;
      player.health -= 6;
      audio.crash();
      showToast(hud, 'Police rammed you!');
      if (player.health <= 0) endGame('over');
    }
  });

  // Mission + taxi + collectibles
  updateMissions(missions, player, dt, onMissionEvent);
  const step = missionStep(missions);
  if (step) {
    city.marker.visible = true;
    city.marker.position.set(step.x, 0, step.z);
    city.marker.children[1].position.y = 8 + Math.sin(performance.now() / 300) * 0.8;
  } else if (missions.taxi) {
    city.marker.visible = true;
    city.marker.position.set(missions.taxi.pickupX, 0, missions.taxi.pickupZ);
  } else {
    city.marker.visible = false;
  }
  // Collectible sun-coins
  for (const c of missions.collectibles) {
    if (!c.taken && Math.hypot(player.x - c.x, player.z - c.z) < 4) {
      c.taken = true;
      player.money += 100;
      audio.cash();
      showToast(hud, 'Sun-coin found! +$100');
    }
  }
  // Taxi pickup / drop-off
  if (missions.taxi) {
    const t = missions.taxi;
    const target = t.state === 'pickup' ? { x: t.pickupX, z: t.pickupZ } : { x: t.destX, z: t.destZ };
    if (Math.hypot(player.x - target.x, player.z - target.z) < 8) {
      if (t.state === 'pickup') { t.state = 'dropoff'; showToast(hud, 'Passenger aboard — drive to the marker!'); }
      else { player.money += 120; audio.cash(); showToast(hud, 'Taxi fare complete! +$120'); missions.taxi = null; }
    }
  }

  // Wanted follows the police state; sirens stop when clear.
  player.wanted = police.wanted;
  if (police.wanted === 0) audio.siren(false);

  // Camera: third person behind the player / car, high enough to see the street.
  const camDist = player.inCar ? 16 : 11;
  const camHeight = player.inCar ? 7 : 5.2;
  const backX = player.x - Math.sin(player.angle) * camDist;
  const backZ = player.z - Math.cos(player.angle) * camDist;
  camera.position.lerp(new THREE.Vector3(backX, camHeight, backZ), 1 - Math.pow(0.001, dt));
  camera.lookAt(player.x, 2, player.z);

  // HUD
  const target = step || (missions.taxi ? { x: missions.taxi.pickupX, z: missions.taxi.pickupZ } : null);
  updateHud(hud, {
    wanted: player.wanted, health: player.health, money: player.money,
    hour: player.hour, x: player.x, z: player.z, objective: missionObjectiveText(missions),
    speed: player.inCar && player.car ? player.car.speed : player.speed,
    angle: player.angle, aiming: !player.inCar && screen === 'play',
    missionTarget: target, cars: [...trafficCars, ...police.cars], peds,
    collectibles: missions.collectibles, taxi: missions.taxi,
  });

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; saveGame(); }
}

let lastFrame = performance.now();
let accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, STEP);
  if (screen === 'play') {
    // Real elapsed time, stepped in fixed chunks, so the game runs at full
    // speed even when a slow frame rate paints fewer frames.
    accumulator += Math.min((now - lastFrame) / 1000, 0.25);
    lastFrame = now;
    while (accumulator >= STEP) { update(STEP); accumulator -= STEP; }
  } else if (screen === 'title') {
    lastFrame = now;
    // Title backdrop: slow orbit over the Neon Strip.
    const t = now / 1000;
    camera.position.set(Math.sin(t * 0.05) * 90, 45, Math.cos(t * 0.05) * 90);
    camera.lookAt(0, 0, 0);
    city.updateSun(10);
    updateTraffic(trafficCars, dt, city.colliders);
    renderer.render(scene, camera);
    return;
  }
  renderer.render(scene, camera);
}

function runShot(name) {
  hideMenu();
  screen = 'play';
  audio.unlock();
  const sceneState = stageShot(name, { player, missions, police, trafficCars, peds, city, scene, startMission, addWanted });
  // Keep the HUD honest for the staged frame.
  const step = missionStep(missions);
  updateHud(hud, {
    wanted: player.wanted, health: player.health, money: player.money,
    hour: player.hour, x: player.x, z: player.z, objective: missionObjectiveText(missions),
    speed: player.inCar ? 16 : 5,
    angle: player.angle, aiming: !player.inCar,
    missionTarget: step ? { x: step.x, z: step.z } : null,
    cars: [...trafficCars, ...police.cars], peds,
    collectibles: missions.collectibles, taxi: missions.taxi,
  });
  if (sceneState.dialogue) showDialogue(hud, sceneState.dialogue.who, sceneState.dialogue.text);
  let painted = 0;
  function paint() {
    const dt = STEP;
    // Simulate a little staged motion so traffic and the camera settle.
    updateTraffic(trafficCars, dt, city.colliders);
    updatePedestrians(peds, dt, player, false);
    city.updateSun(player.hour);
    // The player's own mesh is only moved by gameplay updates, so place it here for shots.
    playerMesh.visible = !player.inCar;
    playerMesh.position.set(player.x, 0, player.z);
    playerMesh.rotation.y = player.angle;
    const camDist = player.inCar ? 16 : 11;
    camera.position.set(player.x - Math.sin(player.angle) * camDist, player.inCar ? 7 : 5.2, player.z - Math.cos(player.angle) * camDist);
    camera.lookAt(player.x, 2, player.z);
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

// Menu buttons.
document.getElementById('playbtn').addEventListener('click', () => startGame(false));
const continueBtn = document.getElementById('continuebtn');
if (loadSave()) {
  continueBtn.addEventListener('click', () => startGame(true));
} else {
  continueBtn.style.opacity = '0.45';
  continueBtn.addEventListener('click', () => startGame(false));
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') {
    screen = 'paused';
    setMenu('<h1>PAUSED</h1><p><button id="resumebtn2">▶ Resume</button></p>');
    const b = document.getElementById('resumebtn2');
    if (b) b.addEventListener('click', () => { hideMenu(); screen = 'play'; });
  }
});

if (shot) runShot(shot);
else {
  announce('Solmar Bay. Press Start to play.');
  requestAnimationFrame(frame);
}
