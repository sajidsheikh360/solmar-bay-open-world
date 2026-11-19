// Solmar Bay — boot, the one game loop, the player on foot and in a car,
// the camera, the screens, and saving. The world is built from the modules
// in this folder: city, vehicles, pedestrians, police, missions, combat,
// hud, audio and input. ?shot=cover|chase|mission|night stages a screenshot
// scene instead of running the loop.
import * as THREE from 'three';
import { CAR, CITY, COIN_POSITIONS, MISSIONS, PLAYER, STEP, clamp, distance2D, mulberry32 } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { applyLighting, buildCity, resolveCollisions } from './city.js';
import { driveCar, makeCarMesh, placeCar, spawnParkedCars, spawnTraffic, updateTraffic } from './vehicles.js';
import { makePedMesh, spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { addWanted, updatePolice } from './police.js';
import { createMissionState, currentObjective, startMission, updateMissions } from './missions.js';
import { punch, shoot } from './combat.js';
import { createHUD, updateHUD } from './hud.js';
import { stageShot } from './shots.js';

const SAVE_KEY = 'solmarBaySaveV1';
const MAX_FRAME = 0.25;

export function createGame() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 800);

  const sun = new THREE.DirectionalLight(0xfff2cc, 1.6);
  sun.position.set(80, 140, 40);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a5f3a, 0.7);
  scene.add(hemi);

  const city = buildCity(scene);
  const parkedCars = spawnParkedCars(scene);
  const traffic = spawnTraffic(scene, 12);
  const peds = spawnPedestrians(scene, 16);

  // Mara Voss, the player, on foot: jacket, head, and a pistol in hand.
  const playerMesh = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x0e7a6b }),
  );
  torso.position.y = 1.05;
  playerMesh.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
  );
  head.position.y = 1.75;
  playerMesh.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.6, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x22222c }),
  );
  legs.position.y = 0.3;
  playerMesh.add(legs);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x111111 }),
  );
  gun.position.set(0.4, 1.1, 0.3);
  playerMesh.add(gun);
  scene.add(playerMesh);

  // The gold mission marker: a beacon column and a spinning diamond.
  const marker = new THREE.Group();
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 15;
  marker.add(beacon);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  diamond.position.y = 4;
  marker.add(diamond);
  marker.visible = false;
  scene.add(marker);

  // Sun coins: twelve gold collectibles around the city.
  const coins = [];
  const coinGeo = new THREE.SphereGeometry(0.55, 12, 10);
  const coinMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
  for (const [x, z] of COIN_POSITIONS) {
    const mesh = new THREE.Mesh(coinGeo, coinMat);
    mesh.position.set(x, 1.2, z);
    scene.add(mesh);
    coins.push({ mesh, pos: new THREE.Vector3(x, 0, z), taken: false });
  }

  const game = {
    scene,
    camera,
    renderer,
    sun,
    ambient,
    hemi,
    lamps: city.lamps,
    colliders: city.colliders,
    parkedCars,
    traffic,
    peds,
    policeCars: [],
    police: { arrestTimer: 0, shootTimer: 0 },
    coins,
    marker,
    missions: createMissionState(),
    hud: createHUD(),
    input: new Input(canvas),
    audio: new AudioEngine(),
    playerMesh,
    time: 0,
    clockHour: 12,
    districtName: 'Neon Strip',
    screen: 'title',
    lastDamageAt: -99,
    saveTimer: 0,
    player: {
      pos: new THREE.Vector3(0, 0, 20),
      heading: Math.PI,
      health: PLAYER.maxHealth,
      money: 250,
      wanted: 0,
      lastCrimeAt: -999,
      wantedDecay: 0,
      inCar: false,
      car: null,
      ammo: 24,
      shootCooldown: 0,
      punchCooldown: 0,
      crimeReason: '',
    },
  };

  game.applyLighting = () => applyLighting(scene, sun, ambient, hemi, game.clockHour, city.lamps);

  game.updateCamera = (dt) => {
    const p = game.player;
    const forward = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
    const targetPos = new THREE.Vector3(
      p.pos.x - forward.x * (p.inCar ? 13 : 9),
      p.inCar ? 5.5 : 4.5,
      p.pos.z - forward.z * (p.inCar ? 13 : 9),
    );
    const blend = dt > 0 ? Math.min(1, dt * 6) : 1;
    camera.position.lerp(targetPos, blend);
    camera.lookAt(p.pos.x + forward.x * 6, 1.6, p.pos.z + forward.z * 6);
  };

  game.render = () => {
    renderer.render(scene, camera);
    updateHUD(game.hud, game, 0);
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return game;
}

function districtAt(game) {
  const districts = [
    ['Marina', -100, 100], ['Old Town', -80, -80], ['Palm Heights', 80, -80],
    ['Dockside', 100, 100], ['Neon Strip', 0, 50], ['Beachfront', -125, 0],
  ];
  let best = 'Solmar Bay';
  let bestDist = 1e9;
  for (const [name, x, z] of districts) {
    const d = distance2D(game.player.pos.x, game.player.pos.z, x, z);
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}

function nearestCar(game, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of [...game.parkedCars, ...game.traffic]) {
    const d = distance2D(game.player.pos.x, game.player.pos.z, car.pos.x, car.pos.z);
    if (d < bestDist) {
      best = car;
      bestDist = d;
    }
  }
  return best;
}

function enterCar(game, car) {
  game.player.inCar = true;
  game.player.car = car;
  game.playerMesh.visible = false;
  game.player.pos.copy(car.pos);
  game.player.heading = car.heading;
  if (!car.owned) {
    car.owned = true;
    addWanted(game, 1, 'stole a car');
    game.hud.setDialogue('Mara: Borrowed. Permanently.');
  }
  game.audio.blip(300, 0.1, 'square', 0.08);
}

function exitCar(game) {
  const car = game.player.car;
  if (!car) return;
  game.player.inCar = false;
  game.player.car = null;
  game.playerMesh.visible = true;
  game.player.pos.set(car.pos.x + 2.5, 0, car.pos.z + 1);
  game.player.heading = car.heading;
  car.speed = 0;
}

function updatePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.heading += input.takeLook() * 0.004;

  if (p.inCar && p.car) {
    const brake = input.down('Space') ? -1 : 0;
    driveCar(p.car, input.steer(), input.throttle() || brake, dt, game.colliders, resolveCollisions);
    p.pos.copy(p.car.pos);
    p.heading = p.car.heading;
    if (input.take('KeyE')) exitCar(game);
    if (p.car && p.car.damage >= 100) {
      p.health -= 30 * dt;
      if (Math.random() < dt * 0.5) game.hud.toast('Your car is falling apart — get out!');
    }
  } else {
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const fwd = input.throttle();
    const strafe = -input.steer();
    const sin = Math.sin(p.heading);
    const cos = Math.cos(p.heading);
    p.pos.x += (sin * fwd + cos * strafe) * speed * dt;
    p.pos.z += (cos * fwd - sin * strafe) * speed * dt;
    p.pos.x = clamp(p.pos.x, -CITY - 20, CITY + 20);
    p.pos.z = clamp(p.pos.z, -CITY - 20, CITY + 20);
    resolveCollisions(p.pos, PLAYER.radius, game.colliders);
    game.playerMesh.position.copy(p.pos);
    game.playerMesh.rotation.y = p.heading;
    if (input.take('KeyE')) {
      const car = nearestCar(game, 4.5);
      if (car) enterCar(game, car);
    }
    if (input.take('KeyF')) punch(game);
    if (input.takeClick()) shoot(game);
  }

  // Slow health regen out of danger.
  if (game.time - game.lastDamageAt > 5 && p.health > 0 && p.health < PLAYER.maxHealth) {
    p.health = Math.min(PLAYER.maxHealth, p.health + 3 * dt);
  }
}

function updateCoins(game, dt) {
  for (const coin of game.coins) {
    if (coin.taken) continue;
    coin.mesh.rotation.y += dt * 2;
    coin.mesh.position.y = 1.2 + Math.sin(game.time * 3 + coin.pos.x) * 0.25;
    if (distance2D(game.player.pos.x, game.player.pos.z, coin.pos.x, coin.pos.z) < 2.5) {
      coin.taken = true;
      coin.mesh.visible = false;
      game.player.money += 100;
      game.audio.pickup();
      game.hud.toast('Sun coin collected — +$100');
    }
  }
}

function updateMarker(game) {
  const objective = currentObjective(game.missions);
  const taxi = game.missions.taxi;
  let target = null;
  if (objective && objective.x !== undefined) target = objective;
  else if (taxi && taxi.stage === 'ride') target = { x: taxi.destX, z: taxi.destZ };
  else if (taxi) target = { x: taxi.x, z: taxi.z };
  if (!target) {
    game.marker.visible = false;
    return;
  }
  game.marker.visible = true;
  game.marker.position.set(target.x, 0, target.z);
  game.marker.children[1].rotation.y += 0.03;
  game.marker.children[1].position.y = 4 + Math.sin(game.time * 2) * 0.5;
}

function saveGame(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: game.player.money,
      mission: game.missions.index,
      x: game.player.pos.x,
      z: game.player.pos.z,
      hour: game.clockHour,
    }));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

function loadSave() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

function update(game, dt) {
  game.time += dt;
  game.clockHour += dt / 120;
  if (game.clockHour >= 24) game.clockHour -= 24;
  game.districtName = districtAt(game);
  updatePlayer(game, dt);
  updateTraffic(game.traffic, dt, game.scene);
  updatePedestrians(game.peds, dt, game.lastShotPos);
  game.lastShotPos = null;
  updatePolice(game, dt);
  updateMissions(game, dt);
  updateCoins(game, dt);
  updateMarker(game);
  game.applyLighting();
  game.audio.setEngine(game.player.inCar ? Math.abs(game.player.car.speed) : 0, game.player.inCar);
  game.audio.updateSiren(dt, game.player.wanted);
  game.updateCamera(dt);
  updateHUD(game.hud, game, dt);
  game.saveTimer += dt;
  if (game.saveTimer > 15) {
    game.saveTimer = 0;
    saveGame(game);
  }
  if (game.player.health <= 0 && game.screen === 'play') {
    game.player.health = 0;
    game.screen = 'wasted';
    game.audio.busted();
    game.hud.showScreen('WASTED', 'Mara is down. The city keeps moving without her — press Enter to get back up.');
  }
  if (game.screen === 'busted') {
    game.hud.showScreen('BUSTED', 'The Solmar Bay police have you. Press Enter to post bail and start again.');
  }
}

function startNewGame(game) {
  game.player.health = PLAYER.maxHealth;
  game.player.money = 250;
  game.player.wanted = 0;
  game.player.pos.set(0, 0, 20);
  game.player.heading = Math.PI;
  game.player.inCar = false;
  game.player.car = null;
  game.playerMesh.visible = true;
  game.playerMesh.position.copy(game.player.pos);
  game.missions.index = 0;
  game.missions.objective = 0;
  game.missions.allDone = false;
  game.clockHour = 12;
  game.screen = 'play';
  game.hud.hideScreen();
  game.audio.ensure();
  startMission(game, 0);
  saveGame(game);
}

function continueGame(game, save) {
  startNewGame(game);
  game.player.money = save.money;
  game.missions.index = save.mission || 0;
  game.player.pos.set(save.x || 0, 0, save.z || 20);
  game.clockHour = save.hour || 12;
  startMission(game, game.missions.index);
  game.hud.toast('Welcome back to Solmar Bay, Mara.');
}

function runGame(game) {
  const input = game.input;
  const save = loadSave();
  game.hud.showScreen(
    'SOLMAR BAY',
    'An original open-world crime game. WASD move / drive, mouse drag to look, click to shoot, E enter or steal a car, F punch, Space brake, Shift run, P pause. '
    + 'Five story missions, taxi fares and sun coins pay — the police are watching.'
    + (save ? ' A saved game is waiting: press C to continue.' : ' Press Enter to start.'),
  );
  document.getElementById('start-btn').style.display = 'inline-block';
  document.getElementById('start-btn').onclick = () => {
    game.audio.ensure();
    startNewGame(game);
  };
  document.getElementById('continue-btn').style.display = save ? 'inline-block' : 'none';
  document.getElementById('continue-btn').onclick = () => {
    game.audio.ensure();
    continueGame(game, save);
  };
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (game.screen === 'title' || game.screen === 'wasted' || game.screen === 'busted') {
      if (input.take('Enter') || input.take('NumpadEnter')) {
        if (game.screen === 'title' && input.down('KeyC') && save) continueGame(game, save);
        else startNewGame(game);
      }
      if (game.screen === 'title' && input.take('KeyC') && save) continueGame(game, save);
      game.updateCamera(0.016);
      game.renderer.render(game.scene, game.camera);
      input.endFrame();
      return;
    }
    if (input.take('KeyP') || input.take('Escape')) {
      if (game.screen === 'play') {
        game.screen = 'paused';
        saveGame(game);
        game.hud.showScreen('PAUSED', 'Solmar Bay is waiting. Press P or Enter to keep playing.');
      } else if (game.screen === 'paused') {
        game.screen = 'play';
        game.hud.hideScreen();
      }
    }
    if (game.screen === 'paused') {
      input.endFrame();
      return;
    }
    accumulator += frameDt;
    while (accumulator >= STEP) {
      update(game, STEP);
      accumulator -= STEP;
    }
    game.renderer.render(game.scene, game.camera);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}

function runShot(game, name) {
  stageShot(game, name);
  let painted = 0;
  function paint() {
    game.renderer.render(game.scene, game.camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const game = createGame();
window.__game = game;
game.applyLighting();
game.updateCamera(0);
if (shotName) runShot(game, shotName);
else runGame(game);
