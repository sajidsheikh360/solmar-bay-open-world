// Wanted level and police: stars rise when the player steals, shoots or
// crashes into police; police cars chase and ram, officers chase on foot and
// arrest the player when they get close. Hiding out of sight lets it decay.
import { createCar } from './vehicles.js';

export function createPolice(scene) {
  return { cars: [], officers: [], wanted: 0, heat: 0, decayTimer: 0 };
}

export function addWanted(police, amount, scene) {
  police.wanted = Math.max(0, Math.min(5, police.wanted + amount));
  police.heat = 100;
  ensurePolice(police, scene);
}

export function ensurePolice(police, scene) {
  const wantCars = police.wanted >= 3 ? 3 : police.wanted >= 1 ? 2 : 0;
  while (police.cars.length < wantCars) {
    const car = createCar(0, 0, 0, 0x111111, true);
    car.driver = 'police';
    scene.add(car.mesh);
    police.cars.push(car);
  }
  while (police.cars.length > wantCars) {
    const car = police.cars.pop();
    scene.remove(car.mesh);
  }
}

export function updatePolice(police, dt, player, scene, onArrest, onRam) {
  ensurePolice(police, scene);
  // Wanted decays when the player is far from every police unit.
  let nearest = Infinity;
  for (const c of police.cars) nearest = Math.min(nearest, Math.hypot(c.x - player.x, c.z - player.z));
  for (const o of police.officers) nearest = Math.min(nearest, Math.hypot(o.x - player.x, o.z - player.z));
  if (police.wanted > 0 && nearest > 90) {
    police.decayTimer += dt;
    if (police.decayTimer > 8) { police.wanted -= 1; police.decayTimer = 0; ensurePolice(police, scene); }
  } else {
    police.decayTimer = 0;
  }

  for (const car of police.cars) {
    // Spawn / respawn behind the player when far away.
    if (Math.hypot(car.x - player.x, car.z - player.z) > 160) {
      car.x = player.x + (Math.random() < 0.5 ? -50 : 50);
      car.z = player.z + (Math.random() < 0.5 ? -50 : 50);
      car.speed = 10;
    }
    const dx = player.x - car.x;
    const dz = player.z - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    car.speed = Math.min(26 + police.wanted, car.speed + 14 * dt);
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    if (car.mesh.userData.lightBar) {
      car.mesh.userData.lightBar.material.color.setHex(Math.floor(performance.now() / 250) % 2 ? 0xFF2222 : 0x2244FF);
    }
    if (dist < 3.2) {
      if (player.inCar) {
        if (onRam) onRam();
        car.speed *= 0.4;
      } else if (onArrest) {
        onArrest();
      }
    }
  }
}
