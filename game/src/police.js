// The wanted system and the Solmar Bay police: patrol cars that chase and
// ram the player, officers on foot who arrest, and a wanted level that
// decays when the player stays out of sight.
import * as THREE from 'three';
import { makeCar, placeCar } from './vehicles.js';
import { angleTo, clamp, distance2D } from './config.js';

export function addWanted(game, amount, reason) {
  const before = game.player.wanted;
  game.player.wanted = clamp(game.player.wanted + amount, 0, 5);
  if (game.player.wanted > before) {
    game.player.lastCrimeAt = game.time;
    game.player.crimeReason = reason;
    if (game.hud) game.hud.toast(`Wanted level ${game.player.wanted} — ${reason}`);
  }
}

export function spawnPoliceCar(game) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 45 + Math.random() * 25;
  const x = game.player.pos.x + Math.sin(angle) * dist;
  const z = game.player.pos.z + Math.cos(angle) * dist;
  const car = makeCar(
    Math.max(-130, Math.min(130, x)),
    Math.max(-130, Math.min(130, z)),
    angleTo(x, z, game.player.pos.x, game.player.pos.z),
    0x1a1a22,
    true,
  );
  car.speed = 12;
  placeCar(car, game.scene);
  game.policeCars.push(car);
  return car;
}

export function updatePolice(game, dt) {
  const wanted = game.player.wanted;
  const targetCount = wanted === 0 ? 0 : Math.min(4, wanted);
  while (game.policeCars.length < targetCount) spawnPoliceCar(game);
  while (game.policeCars.length > targetCount) {
    const car = game.policeCars.pop();
    game.scene.remove(car.mesh);
  }
  for (const car of game.policeCars) {
    const dist = distance2D(car.pos.x, car.pos.z, game.player.pos.x, game.player.pos.z);
    const wantAngle = angleTo(car.pos.x, car.pos.z, game.player.pos.x, game.player.pos.z);
    let diff = wantAngle - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += clamp(diff, -1.6 * dt, 1.6 * dt);
    car.speed = Math.min(16 + wanted * 1.5, car.speed + 6 * dt);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    if (car.mesh.userData.lightBar) {
      car.mesh.userData.lightBar.material.color.set(
        Math.floor(game.time * 4) % 2 === 0 ? 0xff2222 : 0x2255ff,
      );
    }
    // Ram the player: a hard hit hurts, and on foot it can end the run.
    if (dist < 3) {
      if (game.player.inCar) {
        game.player.car.damage += 12 * dt;
        game.player.health -= 4 * dt;
      } else {
        game.player.health -= 18 * dt;
      }
      game.audio.blip(160, 0.1, 'square', 0.08);
    }
  }

  // Officers on foot close in when the player is on foot and wanted.
  if (!game.player.inCar && wanted >= 2) {
    game.police.arrestTimer += dt;
    const nearest = game.policeCars[0];
    if (nearest) {
      const dist = distance2D(nearest.pos.x, nearest.pos.z, game.player.pos.x, game.player.pos.z);
      if (dist < 6 && game.police.arrestTimer > 1.5) {
        game.screen = 'busted';
        game.audio.busted();
      }
    }
  } else {
    game.police.arrestTimer = 0;
  }

  // Wanted decays after 25 quiet seconds, faster when far from police.
  if (wanted > 0 && game.time - game.player.lastCrimeAt > 25) {
    const nearestDist = game.policeCars.length === 0
      ? 999
      : Math.min(...game.policeCars.map((c) => distance2D(c.pos.x, c.pos.z, game.player.pos.x, game.player.pos.z)));
    if (nearestDist > 45) {
      game.player.wantedDecay = (game.player.wantedDecay || 0) + dt;
      if (game.player.wantedDecay > 10) {
        game.player.wanted -= 1;
        game.player.wantedDecay = 0;
        if (game.hud) game.hud.toast(`Wanted level ${game.player.wanted}`);
      }
    }
  }

  // Police shoot back at high wanted levels.
  if (wanted >= 3 && game.policeCars.length > 0) {
    game.police.shootTimer = (game.police.shootTimer || 0) - dt;
    if (game.police.shootTimer <= 0) {
      game.police.shootTimer = 1.6;
      const dist = distance2D(game.policeCars[0].pos.x, game.policeCars[0].pos.z, game.player.pos.x, game.player.pos.z);
      if (dist < 30) {
        game.player.health -= 8;
        game.audio.shot();
        if (game.hud) game.hud.flashDamage();
      }
    }
  }
}
