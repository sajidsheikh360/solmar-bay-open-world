// Solmar Bay — shared constants, districts, story missions and tuning.
// Everything here is original: a sun-soaked coastal city of our own invention.
export const STEP = 1 / 60;
export const CITY = 130; // half-extent of the drivable city, in metres
export const ROADS = [-100, -50, 0, 50, 100]; // road centre lines, both axes
export const ROAD_WIDTH = 12;

export const DISTRICTS = [
  { name: 'Marina', x: -100, z: 100, color: '#2e86ab' },
  { name: 'Old Town', x: -80, z: -80, color: '#c98f2e' },
  { name: 'Palm Heights', x: 80, z: -80, color: '#3fa66a' },
  { name: 'Dockside', x: 100, z: 100, color: '#7a5fb0' },
  { name: 'Neon Strip', x: 0, z: 50, color: '#e5488f' },
  { name: 'Beachfront', x: -125, z: 0, color: '#e8c97a' },
];

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  radius: 0.6,
  maxHealth: 100,
};

export const CAR = {
  maxSpeed: 30,
  accel: 14,
  brake: 26,
  steer: 2.1,
  reverseSpeed: 10,
};

// Five story missions. Each objective is a place to reach, a car to steal,
// a person to collect, or an escape — completed in order.
export const MISSIONS = [
  {
    id: 1,
    title: 'First Delivery',
    giver: 'Lena Kaur',
    briefing: 'Lena needs a package run to the Marina, then on to Palm Heights. Keep it quiet.',
    reward: 200,
    objectives: [
      { kind: 'goto', label: 'Pick up the package at the Marina', x: -100, z: 100 },
      { kind: 'goto', label: 'Deliver the package in Palm Heights', x: 100, z: -100 },
    ],
  },
  {
    id: 2,
    title: 'Neon Getaway',
    giver: 'Tomas Reyes',
    briefing: 'Tomas wants a fast car off the Neon Strip. Steal one, then lose yourself at Dockside.',
    reward: 350,
    objectives: [
      { kind: 'car', label: 'Steal a fast car on the Neon Strip (press E near a car)' },
      { kind: 'goto', label: 'Reach the Dockside hideout', x: 100, z: 100 },
    ],
  },
  {
    id: 3,
    title: 'Rescue Lena',
    giver: 'Lena Kaur',
    briefing: 'Lena is cornered in Old Town. Get to her, pick her up, and drive her to the Palm Heights safehouse.',
    reward: 400,
    objectives: [
      { kind: 'goto', label: 'Reach Lena in Old Town', x: -100, z: -100 },
      { kind: 'goto', label: 'Drive Lena to the Palm Heights safehouse', x: 100, z: -100, needsCar: true },
    ],
  },
  {
    id: 4,
    title: 'Turf Pickup',
    giver: 'Tomas Reyes',
    briefing: 'Three drops are waiting around the city. Grab them all — the police are already watching.',
    reward: 500,
    objectives: [
      { kind: 'goto', label: 'Collect the drop at the Marina', x: -100, z: 50 },
      { kind: 'goto', label: 'Collect the drop at Dockside', x: 100, z: 50 },
      { kind: 'goto', label: 'Collect the drop on the Neon Strip', x: 0, z: 50 },
    ],
  },
  {
    id: 5,
    title: 'The Solmar Heist',
    giver: 'Inspector Hale',
    briefing: 'One last job: the Marina bank. Take the cash, then escape to the safehouse with the whole city after you.',
    reward: 1000,
    objectives: [
      { kind: 'goto', label: 'Reach the Marina bank', x: -100, z: -100 },
      { kind: 'escape', label: 'Escape to the safehouse — do not get busted', x: 0, z: 100 },
    ],
  },
];

// Sun coins sit at road intersections, where the player can actually reach them.
export const COIN_POSITIONS = [
  [-100, -100], [0, -100], [100, -100], [-100, 0], [50, 0], [100, 0],
  [-100, 50], [50, 50], [100, 50], [-100, 100], [0, 100], [100, 100],
];

export const CAR_COLORS = [0xd33a2c, 0x2c6fd3, 0xe8c832, 0x3fa66a, 0xe8e8e8, 0x222226, 0x7a5fb0, 0xe07b39];
export const BUILDING_COLORS = [0xf2d8a7, 0xe8b48a, 0xc9d6e2, 0xf5e6c8, 0xd9a0a0, 0xa8c8b0, 0xe8dcc8, 0xb8c8d8];

// A small deterministic random helper so staged shots are repeatable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distance2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function angleTo(ax, az, bx, bz) {
  return Math.atan2(bx - ax, bz - az);
}
