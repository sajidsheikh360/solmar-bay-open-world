// The city of Solmar Bay: roads, buildings, beach, marina, palms, lamps and
// the neon signs of the Neon Strip. All geometry is generated here, from
// the road grid in config.js — no borrowed map or assets.
import * as THREE from 'three';
import { BUILDING_COLORS, CITY, ROADS, ROAD_WIDTH, mulberry32 } from './config.js';

// A canvas texture with glowing text, used for neon signs and shop fronts.
function textTexture(text, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = fg;
  ctx.shadowBlur = 26;
  ctx.fillText(text, 256, 66);
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const colliders = [];
  const neonSigns = [];
  const lamps = [];
  const rand = mulberry32(20261119);

  // Ground: grass-green base, sand on the west beach, water further west.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY * 2 + 120, CITY * 2 + 120),
    new THREE.MeshLambertMaterial({ color: 0x6fae5e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(36, CITY * 2 + 120),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-CITY - 18, 0.02, 0);
  scene.add(sand);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(80, CITY * 2 + 160),
    new THREE.MeshLambertMaterial({ color: 0x2e86ab, transparent: true, opacity: 0.85 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-CITY - 76, 0.05, 0);
  scene.add(water);

  // Roads: dark asphalt strips along every grid line, plus centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33363c });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xe8d832 });
  for (const line of ROADS) {
    for (const [w, l, x, z] of [
      [ROAD_WIDTH, CITY * 2, line, 0],
      [CITY * 2, ROAD_WIDTH, 0, line],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.04, z);
      scene.add(road);
    }
    for (let d = -CITY + 6; d < CITY; d += 12) {
      for (const [x, z, horizontal] of [[line, d, false], [d, line, true]]) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(horizontal ? 4 : 0.5, horizontal ? 0.5 : 4),
          dashMat,
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.06, z);
        scene.add(dash);
      }
    }
  }

  // Buildings fill every block between roads. Heights and colours vary;
  // each one is a collider the player and cars cannot pass through.
  const blockCentres = [-125, -75, -25, 25, 75, 125];
  for (const bx of blockCentres) {
    for (const bz of blockCentres) {
      if (Math.abs(bx) > CITY || Math.abs(bz) > CITY) continue;
      const count = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i += 1) {
        const w = 12 + rand() * 14;
        const d = 12 + rand() * 14;
        const h = 8 + rand() * rand() * 34;
        const x = bx + (rand() - 0.5) * (44 - w);
        const z = bz + (rand() - 0.5) * (44 - d);
        const color = BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)];
        const mat = new THREE.MeshLambertMaterial({ color });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(x, h / 2, z);
        scene.add(building);
        // A lit window band near the top so the skyline reads at night.
        const windows = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.2, 1.6, d + 0.2),
          new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
        );
        windows.position.set(x, h - 2.4, z);
        scene.add(windows);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Palm trees along the beachfront and the Marina.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  for (let i = 0; i < 26; i += 1) {
    const x = -CITY + 4 + rand() * 8;
    const z = -CITY + 10 + rand() * (CITY * 2 - 20);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 7), leafMat);
    leaves.position.set(x, 8, z);
    scene.add(leaves);
  }

  // Neon Strip: big glowing signs over the z = 50 road, facing the traffic.
  const signs = [
    ['SOLMAR', '#ff2e88', 0, 50],
    ['NEON', '#22e6ff', -50, 50],
    ['PALMS', '#7dff5e', 50, 50],
    ['CASINO', '#ffd23e', 100, 50],
    ['MARINA', '#22e6ff', -100, 100],
  ];
  for (const [text, fg, x, z] of signs) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 5.5),
      new THREE.MeshBasicMaterial({ map: textTexture(text, fg, '#0a0a14'), side: THREE.DoubleSide }),
    );
    sign.position.set(x, 11, z - 8);
    scene.add(sign);
    neonSigns.push(sign);
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 11, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x222226 }),
    );
    post.position.set(x - 9, 5.5, z - 8);
    scene.add(post);
    colliders.push({ minX: x - 9.6, maxX: x - 8.4, minZ: z - 8.6, maxZ: z - 7.4 });
  }

  // Street lamps at intersections; their heads glow at night.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x44484e });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const x of ROADS) {
    for (const z of ROADS) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), lampMat);
      pole.position.set(x + 7, 3.5, z + 7);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), headMat);
      head.position.set(x + 7, 7.2, z + 7);
      scene.add(head);
      lamps.push(head);
    }
  }

  // Marina docks and a few boats at the south edge.
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  for (let i = 0; i < 4; i += 1) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 18), dockMat);
    dock.position.set(-110 + i * 12, 0.4, 138);
    scene.add(dock);
    const boat = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.2, 7),
      new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }),
    );
    boat.position.set(-110 + i * 12, 0.8, 128);
    scene.add(boat);
  }

  return { colliders, neonSigns, lamps };
}

// Sun, sky and lamp brightness for a given game hour (0-24).
export function applyLighting(scene, sun, ambient, hemi, hour, lamps) {
  const night = hour < 6 || hour >= 20;
  const dusk = (hour >= 17 && hour < 20) || (hour >= 6 && hour < 8);
  if (night) {
    scene.background = new THREE.Color(0x0b1026);
    sun.intensity = 0.25;
    sun.color.set(0x8fa8ff);
    ambient.intensity = 0.35;
    hemi.intensity = 0.3;
  } else if (dusk) {
    scene.background = new THREE.Color(0xff9e5e);
    sun.intensity = 1.1;
    sun.color.set(0xffb36b);
    ambient.intensity = 0.6;
    hemi.intensity = 0.5;
  } else {
    scene.background = new THREE.Color(0x87ceeb);
    sun.intensity = 1.6;
    sun.color.set(0xfff2cc);
    ambient.intensity = 0.75;
    hemi.intensity = 0.7;
  }
  const lampGlow = night ? 0xffe9a8 : 0x8a8578;
  for (const lamp of lamps) lamp.material.color.set(lampGlow);
}

// Push a circle (player or car) out of every building it overlaps.
export function resolveCollisions(pos, radius, colliders) {
  for (const box of colliders) {
    const cx = Math.max(box.minX, Math.min(pos.x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    if (distSq < 0.0001) {
      pos.x = box.maxX + radius;
      continue;
    }
    const dist = Math.sqrt(distSq);
    pos.x = cx + (dx / dist) * radius;
    pos.z = cz + (dz / dist) * radius;
  }
}
