// Cars for Solmar Bay: the player's drivable cars, parked stealable cars
// and the traffic that fills the roads. Driving is arcade: accelerate,
// steer, brake, and the car slides a little at speed.
import * as THREE from 'three';
import { CAR, CAR_COLORS, CITY, ROADS, mulberry32 } from './config.js';

export function makeCarMesh(color, isPolice = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a1a22 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), paint);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cabin.position.set(0, 1.25, -0.2);
  group.add(cabin);
  if (isPolice) {
    const lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    lightBar.position.set(0, 1.65, -0.2);
    group.add(lightBar);
    group.userData.lightBar = lightBar;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.3, 4.42),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    stripe.position.y = 0.65;
    group.add(stripe);
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    group.add(wheel);
  }
  return group;
}

export function makeCar(x, z, heading, color, isPolice = false) {
  return {
    mesh: makeCarMesh(color, isPolice),
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    isPolice,
    color,
    owned: false,
    damage: 0,
    targetSpeed: 0,
  };
}

export function placeCar(car, scene) {
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  scene.add(car.mesh);
}

// Parked cars the player can steal, plus a few the traffic owns.
export function spawnParkedCars(scene) {
  const rand = mulberry32(77);
  const cars = [];
  const spots = [
    [-50, 6, 0], [50, -6, Math.PI], [0, 56, Math.PI / 2], [-100, 44, 0],
    [100, -44, Math.PI], [-50, -56, Math.PI / 2], [50, 106, 0], [0, -106, Math.PI],
    [-106, 0, Math.PI / 2], [106, 6, -Math.PI / 2], [50, 44, 0], [-50, -44, Math.PI],
  ];
  for (const [x, z, heading] of spots) {
    const car = makeCar(x + (rand() - 0.5) * 2, z + (rand() - 0.5) * 2, heading, CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)]);
    placeCar(car, scene);
    cars.push(car);
  }
  return cars;
}

// Traffic cars drive along one road, then turn onto another at the edge.
export function spawnTraffic(scene, count = 12) {
  const rand = mulberry32(1234);
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const horizontal = rand() > 0.5;
    const line = ROADS[Math.floor(rand() * ROADS.length)];
    const along = -CITY + rand() * CITY * 2;
    const dir = rand() > 0.5 ? 1 : -1;
    const car = makeCar(
      horizontal ? along : line + (dir > 0 ? 3 : -3),
      horizontal ? line + (dir > 0 ? 3 : -3) : along,
      horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
    );
    car.speed = 8 + rand() * 4;
    car.axis = horizontal ? 'x' : 'z';
    car.dir = dir;
    car.lane = line;
    placeCar(car, scene);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, scene) {
  for (const car of cars) {
    const step = car.speed * car.dir * dt;
    if (car.axis === 'x') car.pos.x += step;
    else car.pos.z += step;
    const along = car.axis === 'x' ? car.pos.x : car.pos.z;
    if (Math.abs(along) > CITY + 4) {
      // Turn onto a crossing road and drive back the other way.
      const rand = Math.random();
      const newLine = ROADS[Math.floor(rand * ROADS.length)];
      car.axis = car.axis === 'x' ? 'z' : 'x';
      car.dir = rand > 0.5 ? 1 : -1;
      car.lane = newLine;
      if (car.axis === 'x') {
        car.pos.x = -CITY * car.dir;
        car.pos.z = newLine + (car.dir > 0 ? 3 : -3);
        car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        car.pos.z = -CITY * car.dir;
        car.pos.x = newLine + (car.dir > 0 ? 3 : -3);
        car.heading = car.dir > 0 ? 0 : Math.PI;
      }
    }
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
  }
}

// Arcade driving for the car the player is in. Returns nothing; mutates car.
export function driveCar(car, steerInput, throttleInput, dt, colliders, resolve) {
  const forward = throttleInput > 0;
  if (throttleInput !== 0) {
    car.speed += (forward ? CAR.accel : CAR.brake * 0.6) * throttleInput * dt;
  } else {
    car.speed *= Math.pow(0.4, dt);
    if (Math.abs(car.speed) < 0.2) car.speed = 0;
  }
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  if (Math.abs(car.speed) > 0.5) {
    car.heading += steerInput * CAR.steer * dt * (car.speed > 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8);
  }
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  car.pos.x = Math.max(-CITY - 20, Math.min(CITY + 20, car.pos.x));
  car.pos.z = Math.max(-CITY - 20, Math.min(CITY + 20, car.pos.z));
  resolve(car.pos, 1.6, colliders);
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  // Lean a touch into corners so driving reads on screen.
  car.mesh.rotation.z = -steerInput * Math.min(0.08, Math.abs(car.speed) * 0.003);
}
