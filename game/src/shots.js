// Staged screenshot scenes for Solmar Bay. Each one sets up a real gameplay
// state — a live car, real traffic, real police, a real mission — then the
// main loop paints it, so the screenshots show the game as it plays.
import { addWanted, spawnPoliceCar } from './police.js';
import { startMission } from './missions.js';

export function stageShot(game, name) {
  const g = game;
  g.screen = 'play';
  g.hud.hideScreen();
  g.player.health = 85;
  g.player.money = 1250;
  g.player.ammo = 24;
  // Clear any police from a previous staging, then set the scene up fresh.
  for (const car of g.policeCars) g.scene.remove(car.mesh);
  g.policeCars.length = 0;

  if (name === 'chase') {
    // Mara on foot, three stars, police closing in from three sides.
    g.player.inCar = false;
    g.player.car = null;
    g.player.pos.set(0, 0, 0);
    g.player.heading = 0.4;
    g.player.wanted = 3;
    g.player.lastCrimeAt = g.time;
    spawnPoliceCar(g);
    spawnPoliceCar(g);
    spawnPoliceCar(g);
    // Just ahead of Mara, inside the camera's view, closing in.
    g.policeCars[0].pos.set(5, 0, 10);
    g.policeCars[1].pos.set(-7, 0, 11);
    g.policeCars[2].pos.set(9, 0, 15);
    g.clockHour = 15;
    g.hud.setDialogue('Police radio: Suspect on foot at the Marina crossing — move in, move in!');
    g.hud.toast('Wanted level 3 — police are closing in');
  } else if (name === 'mission') {
    // Mission 3 in progress: Lena aboard, driving her to Palm Heights.
    startMission(g, 2);
    g.missions.objective = 1;
    g.missions.passenger = true;
    enterNearestCar(g, 0, 20);
    g.player.pos.set(0, 0, 20);
    g.player.car.pos.set(0, 0, 20);
    g.player.car.heading = Math.PI;
    g.player.heading = Math.PI;
    g.player.wanted = 1;
    g.player.lastCrimeAt = g.time;
    spawnPoliceCar(g);
    g.policeCars[0].pos.set(-16, 0, -18);
    g.clockHour = 17;
    g.hud.setDialogue('Lena: Thanks, Mara — drive, and do not stop for anyone.');
    g.hud.toast('Mission 3 — Rescue Lena: drive to Palm Heights');
  } else if (name === 'night') {
    // Night on the Neon Strip, driving north under the SOLMAR sign.
    enterNearestCar(g, 0, 50);
    g.player.pos.set(0, 0, 50);
    g.player.car.pos.set(0, 0, 50);
    g.player.car.heading = Math.PI;
    g.player.heading = Math.PI;
    g.player.wanted = 1;
    g.player.lastCrimeAt = g.time;
    g.clockHour = 21.5;
    g.hud.setDialogue('Tomas: The Strip never sleeps, Mara. Neither do the cops.');
    g.hud.toast('Neon Strip — 21:30');
  } else {
    // Cover: driving north through the city at noon, mission 2 live.
    startMission(g, 1);
    g.missions.objective = 1;
    enterNearestCar(g, 0, 60);
    g.player.pos.set(0, 0, 60);
    g.player.car.pos.set(0, 0, 60);
    g.player.car.heading = Math.PI;
    g.player.car.speed = 18;
    g.player.heading = Math.PI;
    g.player.wanted = 0;
    g.clockHour = 12;
    g.hud.setDialogue('Tomas: Fast car, Dockside, no questions. Go.');
    g.hud.toast('Mission 2 — Neon Getaway: reach Dockside');
  }
  g.applyLighting();
  g.updateCamera(0);
  // Shot mode never runs the update loop, so sync every mesh to its staged
  // position by hand — otherwise cars and the player render where they were.
  g.playerMesh.position.copy(g.player.pos);
  g.playerMesh.rotation.y = g.player.heading;
  g.playerMesh.visible = !g.player.inCar;
  for (const car of [...g.parkedCars, ...g.traffic, ...g.policeCars]) {
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
  }
  g.render();
}

function enterNearestCar(g, x, z) {
  let best = null;
  let bestDist = 1e9;
  for (const car of g.parkedCars) {
    const dx = car.pos.x - x;
    const dz = car.pos.z - z;
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) {
      best = car;
      bestDist = dist;
    }
  }
  if (!best) return;
  g.player.inCar = true;
  g.player.car = best;
  best.owned = true;
  g.player.pos.copy(best.pos);
}
