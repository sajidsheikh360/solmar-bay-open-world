// Pedestrians: walkers on the sidewalks who stroll, cross streets, flee from
// gunfire, and sometimes wait as taxi passengers.
import * as THREE from 'three';
import { PED_COLORS, ROAD_SPACING, CITY, createRandom } from './config.js';

export function makePedMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 1.5, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xE8B88A }),
  );
  head.position.y = 2.1;
  group.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2A2A3A });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), legMat);
  legL.position.set(-0.2, 0.35, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), legMat);
  legR.position.set(0.2, 0.35, 0);
  group.add(legR);
  group.userData.legL = legL;
  group.userData.legR = legR;
  return group;
}

export function createPedestrians(scene, seed) {
  const random = createRandom(seed + 21);
  const peds = [];
  const roads = [];
  for (let i = -4; i <= 4; i += 1) roads.push(i * ROAD_SPACING);
  for (let i = 0; i < 22; i += 1) {
    const road = roads[Math.floor(random() * roads.length)];
    const along = -CITY + 20 + random() * (CITY * 2 - 40);
    const horizontal = random() < 0.5;
    const x = horizontal ? along : road + 9;
    const z = horizontal ? road + 9 : along;
    const mesh = makePedMesh(PED_COLORS[i % PED_COLORS.length]);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      x, z, angle: random() * Math.PI * 2, speed: 1.2 + random() * 1.2,
      horizontal, dir: random() < 0.5 ? 1 : -1, mesh, health: 50,
      fleeing: false, taxi: i < 3, alive: true, walkPhase: random() * 6,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, player, shooting) {
  for (const p of peds) {
    if (!p.alive) continue;
    const distPlayer = Math.hypot(p.x - player.x, p.z - player.z);
    if (shooting || (distPlayer < 6 && player.wanted > 0)) p.fleeing = true;
    if (p.fleeing) {
      // Run away from the player.
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const len = Math.hypot(dx, dz) || 1;
      p.x += (dx / len) * 4.5 * dt;
      p.z += (dz / len) * 4.5 * dt;
      p.angle = Math.atan2(dx, dz);
      if (distPlayer > 40) p.fleeing = false;
    } else {
      const step = p.speed * dt * p.dir;
      if (p.horizontal) p.x += step; else p.z += step;
      if (p.x > CITY || p.x < -CITY || p.z > CITY || p.z < -CITY) p.dir *= -1;
      p.angle = p.horizontal ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.dir > 0 ? 0 : Math.PI);
    }
    p.walkPhase += dt * (p.fleeing ? 10 : 5);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.angle;
    const swing = Math.sin(p.walkPhase) * 0.4;
    p.mesh.userData.legL.rotation.x = swing;
    p.mesh.userData.legR.rotation.x = -swing;
  }
}
