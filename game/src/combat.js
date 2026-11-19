// Combat for Solmar Bay: punch up close, shoot with the mouse, and take
// damage. Shooting a pedestrian or a police car raises the wanted level;
// police at high wanted levels shoot back (see police.js).
import { angleTo, distance2D } from './config.js';
import { addWanted } from './police.js';

export function shoot(game) {
  if (game.player.shootCooldown > 0) return;
  game.player.shootCooldown = 0.35;
  game.player.ammo = Math.max(0, (game.player.ammo ?? 24) - 1);
  game.audio.shot();
  const px = game.player.pos.x;
  const pz = game.player.pos.z;
  const facing = game.player.heading;
  let best = null;
  let bestDist = 35;
  const consider = (x, z, target) => {
    const dist = distance2D(px, pz, x, z);
    if (dist > bestDist) return;
    let diff = angleTo(px, pz, x, z) - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.35) {
      best = target;
      bestDist = dist;
    }
  };
  for (const ped of game.peds) {
    if (ped.health > 0) consider(ped.pos.x, ped.pos.z, { kind: 'ped', ref: ped });
  }
  for (const car of game.policeCars) consider(car.pos.x, car.pos.z, { kind: 'police', ref: car });
  for (const car of game.traffic) consider(car.pos.x, car.pos.z, { kind: 'traffic', ref: car });
  if (!best) {
    game.lastShotPos = { x: px + Math.sin(facing) * 20, z: pz + Math.cos(facing) * 20 };
    return;
  }
  game.lastShotPos = { x: best.ref.pos.x, z: best.ref.pos.z };
  if (best.kind === 'ped') {
    best.ref.health -= 34;
    if (best.ref.health <= 0) {
      best.ref.mesh.visible = false;
      addWanted(game, 1, 'assault on a pedestrian');
    }
  } else if (best.kind === 'police') {
    best.ref.damage = (best.ref.damage || 0) + 34;
    addWanted(game, 1, 'fired on the police');
    if (best.ref.damage > 100) {
      best.ref.speed = 0;
      best.ref.mesh.rotation.z = 0.2;
    }
  } else {
    best.ref.damage = (best.ref.damage || 0) + 34;
    addWanted(game, 1, 'shot at traffic');
  }
}

export function punch(game) {
  if (game.player.punchCooldown > 0) return;
  game.player.punchCooldown = 0.5;
  const px = game.player.pos.x;
  const pz = game.player.pos.z;
  for (const ped of game.peds) {
    if (ped.health <= 0) continue;
    if (distance2D(px, pz, ped.pos.x, ped.pos.z) < 2.5) {
      ped.health -= 20;
      ped.fleeing = 3;
      ped.heading = angleTo(ped.pos.x, ped.pos.z, px, pz);
      if (ped.health <= 0) ped.mesh.visible = false;
      addWanted(game, 1, 'assault on a pedestrian');
      game.audio.blip(180, 0.12, 'square', 0.12);
      return;
    }
  }
  game.audio.blip(120, 0.08, 'square', 0.06);
}
