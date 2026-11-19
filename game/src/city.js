// Solmar Bay city: roads, buildings, beach, marina, palms, street lights and
// the Neon Strip. All geometry is generated here from a seed — no loaded assets.
import * as THREE from 'three';
import { CITY, ROAD_SPACING, createRandom } from './config.js';

const BUILDING_COLORS = [0xE8DCC8, 0xD9A679, 0x9FB8C8, 0xC8B8D9, 0xF2E6C9, 0xB8C8A8, 0xE8B8A8, 0x8FA8C8, 0xFFF2CC];
const ROOF_COLORS = [0x8A6D4B, 0x5A7A8A, 0xB85C5C, 0x4A6A5A, 0x7A5A8A];

export function createCity(scene, seed) {
  const random = createRandom(seed);
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  // Ground: grass-green city slab, sand beach to the west, blue sea beyond.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY * 2 + 240, CITY * 2 + 120),
    new THREE.MeshLambertMaterial({ color: 0x6A8F5A }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  group.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(70, CITY * 2 + 120),
    new THREE.MeshLambertMaterial({ color: 0xE8D8A8 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-CITY - 35, 0.05, 0);
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(260, CITY * 2 + 200),
    new THREE.MeshLambertMaterial({ color: 0x1E7FB8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-CITY - 200, 0.02, 0);
  group.add(sea);

  // Roads: dark asphalt strips on a grid, with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2E3338 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xE8E8C8 });
  const roads = [];
  for (let i = -4; i <= 4; i += 1) roads.push(i * ROAD_SPACING);
  for (const c of roads) {
    for (const [w, l, x, z] of [[12, CITY * 2, c, 0], [CITY * 2, 12, 0, c]]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.08, z);
      group.add(road);
    }
    for (let d = -CITY + 20; d < CITY; d += 20) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(c, 0.12, d);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(d, 0.12, c);
      group.add(dash2);
    }
  }

  // Buildings: one or two boxes per city block, taller near the Neon Strip.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = -4; bx <= 3; bx += 1) {
    for (let bz = -4; bz <= 3; bz += 1) {
      const cx = bx * ROAD_SPACING + ROAD_SPACING / 2;
      const cz = bz * ROAD_SPACING + ROAD_SPACING / 2;
      const distCentre = Math.abs(cx) + Math.abs(cz);
      if (random() < 0.14) continue; // park / plaza gap
      const tall = distCentre < 60 ? 26 + random() * 34 : 8 + random() * 18;
      const w = 14 + random() * 10;
      const d = 14 + random() * 10;
      const color = BUILDING_COLORS[Math.floor(random() * BUILDING_COLORS.length)];
      const mat = new THREE.MeshLambertMaterial({ color });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, tall, d);
      b.position.set(cx, tall / 2, cz);
      group.add(b);
      const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: ROOF_COLORS[Math.floor(random() * ROOF_COLORS.length)] }));
      roof.scale.set(w + 1, 1, d + 1);
      roof.position.set(cx, tall + 0.5, cz);
      group.add(roof);
      // Lit windows: small emissive planes on the two street faces.
      const winMat = new THREE.MeshBasicMaterial({ color: 0xFFE9A8 });
      for (let wy = 4; wy < tall - 2; wy += 6) {
        for (let wx = -w / 2 + 3; wx < w / 2 - 2; wx += 6) {
          if (random() < 0.45) continue;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.4), winMat);
          win.position.set(cx + wx, wy, cz + d / 2 + 0.06);
          group.add(win);
        }
      }
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }
  }

  // Palm trees along the beach and the Marina promenade.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8A6D4B });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2E8B57 });
  for (let i = 0; i < 46; i += 1) {
    const x = -CITY + 8 + random() * 18;
    const z = -CITY + random() * CITY * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3, 7), leafMat);
    leaves.position.set(x, 8, z);
    group.add(leaves);
  }

  // Street lights along the main roads.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xFFF2B8 });
  for (const c of roads) {
    for (let d = -CITY + 40; d < CITY; d += 80) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), poleMat);
      pole.position.set(c + 7, 3.5, d);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lampMat);
      lamp.position.set(c + 7, 7, d);
      group.add(lamp);
    }
  }

  // Neon Strip: glowing sign boxes around the centre crossroads.
  const neonColors = [0xFF5CE1, 0x00E5FF, 0xFFD23E, 0x7DFF5C, 0xFF5C5C];
  const neonSigns = [];
  // Neon signs stand on the four arms of the central crossroads, where no
  // building blocks them, so they read from down the street at night.
  const signSpots = [
    [4, -30, 0], [-4, -30, 0], [4, 30, 0], [-4, 30, 0],
    [-30, 4, Math.PI / 2], [30, 4, Math.PI / 2], [-30, -4, Math.PI / 2], [30, -4, Math.PI / 2],
  ];
  for (let i = 0; i < signSpots.length; i += 1) {
    const color = neonColors[i % neonColors.length];
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(9 + random() * 4, 2.4, 0.6),
      new THREE.MeshBasicMaterial({ color }),
    );
    const [x, z, rot] = signSpots[i];
    sign.position.set(x, 5.5 + random() * 1.5, z);
    sign.rotation.y = rot;
    group.add(sign);
    neonSigns.push(sign);
  }

  // Marina: wooden pier and moored boats (simple hulls) on the south-east sea edge.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 8), new THREE.MeshLambertMaterial({ color: 0x8A6D4B }));
  pier.position.set(-120, 0.6, 190);
  group.add(pier);
  for (let i = 0; i < 5; i += 1) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 3), new THREE.MeshLambertMaterial({ color: 0xF4F4F4 }));
    hull.position.set(-140 + i * 12, 1, 202 + (i % 2) * 6);
    group.add(hull);
  }

  // Mission marker: a tall glowing beacon + a floating diamond, moved by missions.
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xFFD23E, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beam.position.y = 30;
  marker.add(beam);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.2),
    new THREE.MeshBasicMaterial({ color: 0xFFD23E }),
  );
  diamond.position.y = 8;
  marker.add(diamond);
  marker.visible = false;
  group.add(marker);

  // Sun + ambient light; updateSun moves the sun and tints the sky.
  const sun = new THREE.DirectionalLight(0xFFF2CC, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xBFD8FF, 0.55);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xBFD8FF, 0x3A5A3A, 0.5);
  scene.add(hemi);

  function updateSun(hour) {
    const day = hour >= 6.5 && hour < 18.5;
    const t = day ? (hour - 6.5) / 12 : 0;
    const angle = Math.PI * (0.15 + 0.7 * (day ? t : 0.9));
    sun.position.set(Math.cos(angle) * 220, day ? 60 + Math.sin(angle) * 160 : 30, 80);
    sun.intensity = day ? 1.6 : 0.55;
    sun.color.set(day ? 0xFFF2CC : 0x8FA8FF);
    ambient.intensity = day ? 0.55 : 0.38;
    hemi.intensity = day ? 0.5 : 0.3;
    scene.background = new THREE.Color(day ? 0x87CEEB : 0x0B1026);
    scene.fog = new THREE.Fog(day ? 0xA8D8F0 : 0x0B1026, 180, 520);
    for (const s of neonSigns) s.material.color.setHex(day ? 0x884488 : neonColors[neonSigns.indexOf(s) % neonColors.length]);
  }

  return { colliders, marker, updateSun, neonSigns };
}
