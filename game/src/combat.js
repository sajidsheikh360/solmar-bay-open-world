// Combat: punching, shooting, car damage and health. Shooting is a hitscan
// shot from the camera through the crosshair; hitting a pedestrian or a
// police car raises the wanted level.
import * as THREE from 'three';

export function createCombat() {
  return { cooldown: 0, muzzleFlash: 0 };
}

export function punch(player, peds, police, onHit) {
  let best = null;
  let bestD = 3;
  for (const p of peds) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d < bestD) { bestD = d; best = p; }
  }
  if (best) {
    best.health -= 25;
    if (best.health <= 0) { best.alive = false; best.mesh.visible = false; }
    if (onHit) onHit('ped');
    return true;
  }
  return false;
}

export function shoot(combat, camera, peds, policeCars, player, onHit) {
  if (combat.cooldown > 0) return false;
  combat.cooldown = 0.28;
  combat.muzzleFlash = 0.08;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = 60;
  const targets = [];
  for (const p of peds) if (p.alive) targets.push({ obj: p.mesh, kind: 'ped', ref: p });
  for (const c of policeCars) targets.push({ obj: c.mesh, kind: 'police', ref: c });
  const hits = ray.intersectObjects(targets.map((t) => t.obj), true);
  if (!hits.length) return true; // shot fired, missed
  // Walk up from the hit child mesh to the ped / car group it belongs to.
  let hitObj = hits[0].object;
  let target = null;
  while (hitObj) {
    target = targets.find((t) => t.obj === hitObj);
    if (target) break;
    hitObj = hitObj.parent;
  }
  if (!target) return true;
  if (target && target.kind === 'ped') {
    target.ref.health -= 34;
    if (target.ref.health <= 0) { target.ref.alive = false; target.ref.mesh.visible = false; }
    if (onHit) onHit('ped');
  } else if (target) {
    target.ref.health -= 20;
    if (onHit) onHit('police');
  }
  return true;
}

export function damageCar(car, amount, onBreak) {
  car.health -= amount;
  if (car.health <= 0 && onBreak) onBreak(car);
}
