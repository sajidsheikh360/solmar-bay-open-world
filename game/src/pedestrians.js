// Pedestrians for Solmar Bay: walkers on the sidewalks who stroll, cross
// at intersections, and run away from gunfire.
import * as THREE from 'three';
import { CITY, ROADS, mulberry32 } from './config.js';

const SHIRTS = [0xe84a5f, 0x3fa66a, 0x2c6fd3, 0xe8c832, 0x7a5fb0, 0xe07b39, 0xe8e8e8];

export function makePedMesh(shirt) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 1.1, 8),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  body.position.y = 0.95;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
  );
  head.position.y = 1.75;
  group.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2a2a33 }),
  );
  legs.position.y = 0.25;
  group.add(legs);
  return group;
}

export function spawnPedestrians(scene, count = 16) {
  const rand = mulberry32(99);
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const line = ROADS[Math.floor(rand() * ROADS.length)];
    const along = -CITY + rand() * CITY * 2;
    const horizontal = rand() > 0.5;
    const ped = {
      mesh: makePedMesh(SHIRTS[Math.floor(rand() * SHIRTS.length)]),
      pos: new THREE.Vector3(
        horizontal ? along : line + 8,
        0,
        horizontal ? line + 8 : along,
      ),
      heading: rand() * Math.PI * 2,
      speed: 1 + rand() * 0.8,
      axis: horizontal ? 'x' : 'z',
      dir: rand() > 0.5 ? 1 : -1,
      fleeing: 0,
      health: 100,
    };
    ped.mesh.position.copy(ped.pos);
    scene.add(ped.mesh);
    peds.push(ped);
  }
  return peds;
}

export function updatePedestrians(peds, dt, gunshotPos) {
  for (const ped of peds) {
    if (ped.health <= 0) continue;
    if (gunshotPos) {
      const dx = ped.pos.x - gunshotPos.x;
      const dz = ped.pos.z - gunshotPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 30) {
        ped.fleeing = 3;
        ped.heading = Math.atan2(dx, dz);
      }
    }
    let speed = ped.speed;
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      speed = 4.5;
    } else if (Math.random() < dt * 0.05) {
      ped.dir *= -1;
    }
    if (ped.fleeing > 0) {
      ped.pos.x += Math.sin(ped.heading) * speed * dt;
      ped.pos.z += Math.cos(ped.heading) * speed * dt;
    } else {
      const step = speed * ped.dir * dt;
      if (ped.axis === 'x') ped.pos.x += step;
      else ped.pos.z += step;
      const along = ped.axis === 'x' ? ped.pos.x : ped.pos.z;
      if (Math.abs(along) > CITY) ped.dir *= -1;
      ped.heading = ped.axis === 'x' ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ped.dir > 0 ? 0 : Math.PI);
    }
    ped.pos.x = Math.max(-CITY - 10, Math.min(CITY + 10, ped.pos.x));
    ped.pos.z = Math.max(-CITY - 10, Math.min(CITY + 10, ped.pos.z));
    ped.mesh.position.copy(ped.pos);
    ped.mesh.rotation.y = ped.heading;
    // A little bob so walking reads as walking.
    ped.mesh.position.y = Math.abs(Math.sin(performance.now() / 180 + ped.pos.x)) * 0.06;
  }
}
