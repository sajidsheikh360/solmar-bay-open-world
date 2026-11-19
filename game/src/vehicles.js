// Cars: the player's car and traffic. A car is a low-poly body + cabin + wheels,
// built from boxes so the game needs no model files.
import * as THREE from 'three';
import { CAR_COLORS, ROAD_SPACING, CITY, createRandom } from './config.js';

export function makeCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x111111 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.4), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: isPolice ? 0x222222 : 0x223344 }),
  );
  cabin.position.set(0, 1.15, -0.2);
  group.add(cabin);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.2, 4.42), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
    stripe.position.y = 0.62;
    group.add(stripe);
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xFF2222 }));
    lightBar.position.set(0, 1.55, -0.2);
    group.add(lightBar);
    group.userData.lightBar = lightBar;
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    group.add(w);
    wheels.push(w);
  }
  group.userData.wheels = wheels;
  return group;
}

export function createCar(x, z, angle, color, isPolice) {
  return {
    x, z, angle, speed: 0, color, isPolice: !!isPolice,
    mesh: makeCarMesh(color, isPolice),
    health: 100, driver: null, // 'player' | 'traffic' | 'police' | null (parked)
    targetSpeed: 0, steering: 0,
  };
}

export function createTraffic(seed) {
  const random = createRandom(seed + 7);
  const cars = [];
  const roads = [];
  for (let i = -4; i <= 4; i += 1) roads.push(i * ROAD_SPACING);
  // Parked cars along the roads (stealable) and moving traffic.
  for (let i = 0; i < 16; i += 1) {
    const road = roads[Math.floor(random() * roads.length)];
    const along = -CITY + 30 + random() * (CITY * 2 - 60);
    const horizontal = random() < 0.5;
    const car = createCar(horizontal ? along : road + 7, horizontal ? road + 7 : along, horizontal ? Math.PI / 2 : 0, CAR_COLORS[i % CAR_COLORS.length], false);
    car.driver = null;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    cars.push(car);
  }
  // Two cars parked right by the Marina spawn, so a new player can steal one at once.
  for (const [x, z, angle, color] of [[-120, 100, Math.PI, 0xD7263D], [-113, 140, Math.PI, 0x2EC4FF]]) {
    const car = createCar(x, z, angle, color, false);
    car.driver = null;
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = angle;
    cars.push(car);
  }
  for (let i = 0; i < 14; i += 1) {
    const road = roads[Math.floor(random() * roads.length)];
    const along = -CITY + 20 + random() * (CITY * 2 - 40);
    const horizontal = random() < 0.5;
    const dir = random() < 0.5 ? 1 : -1;
    const car = createCar(horizontal ? along : road + 3 * dir, horizontal ? road + 3 * dir : along, horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI), CAR_COLORS[(i + 3) % CAR_COLORS.length], false);
    car.driver = 'traffic';
    car.speed = 7 + random() * 5;
    car.targetSpeed = car.speed;
    car.horizontal = horizontal;
    car.dir = dir;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    cars.push(car);
  }
  return cars;
}

// Arcade driving: accelerate, steer, brake; simple building collision push-out.
export function driveCar(car, input, dt, colliders, onCrash) {
  const accel = input.z < 0 ? 22 : 0;
  const brake = input.z > 0 ? 34 : 0;
  car.speed += (accel - brake) * dt;
  if (input.z === 0) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  car.speed = Math.max(-10, Math.min(30, car.speed));
  const steer = input.x * 2.1 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 6 + 0.2);
  car.angle += steer * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  let hit = false;
  for (const c of colliders) {
    if (nx > c.minX - 1.2 && nx < c.maxX + 1.2 && nz > c.minZ - 1.2 && nz < c.maxZ + 1.2) { hit = true; break; }
  }
  if (hit) {
    if (Math.abs(car.speed) > 12 && onCrash) onCrash();
    car.speed *= -0.25;
  } else {
    // Keep cars inside the built city, not the empty land beyond it.
    car.x = Math.max(-190, Math.min(190, nx));
    car.z = Math.max(-190, Math.min(190, nz));
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
}

export function updateTraffic(cars, dt, colliders) {
  for (const car of cars) {
    if (car.driver !== 'traffic') continue;
    // Drive straight along its road; at an intersection sometimes turn.
    const roads = [];
    for (let i = -4; i <= 4; i += 1) roads.push(i * ROAD_SPACING);
    const nearIntersection = roads.some((r) => Math.abs((car.horizontal ? car.x : car.z) - r) < 1.2);
    if (nearIntersection && Math.random() < 0.004) {
      car.horizontal = !car.horizontal;
      car.dir = Math.random() < 0.5 ? 1 : -1;
      car.angle = car.horizontal ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    }
    const step = car.speed * dt * car.dir;
    if (car.horizontal) car.x += step; else car.z += step;
    if (car.x > CITY + 10 || car.x < -CITY - 10 || car.z > CITY + 10 || car.z < -CITY - 10) {
      car.x = -car.x * 0.9; car.z = -car.z * 0.9;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
  }
}

export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
