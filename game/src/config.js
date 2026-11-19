// Solmar Bay: shared constants, districts, story missions and tuning.
// Everything here is original: the city, its districts, people and story.
export const STEP = 1 / 60;
export const CITY = 380; // playable half-extent in world units
export const ROAD_SPACING = 40;
export const SAVE_KEY = 'solmar-bay-save-v1';

export const DISTRICTS = [
  { name: 'Marina', x: -140, z: 140, color: '#2ec4ff' },
  { name: 'Old Town', x: -100, z: -60, color: '#ffb347' },
  { name: 'Palm Heights', x: 100, z: -120, color: '#7dff9a' },
  { name: 'Dockside', x: 140, z: 100, color: '#ff7b7b' },
  { name: 'Neon Strip', x: 0, z: 0, color: '#ff5ce1' },
  { name: 'Beachfront', x: -190, z: 0, color: '#ffe9a8' },
];

export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = (x - d.x) * (x - d.x) + (z - d.z) * (z - d.z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best.name;
}

// Seeded random so a ?seed= shot always stages the same city.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CAR_COLORS = [0xd7263d, 0x2ec4ff, 0xffd23e, 0x7dff9a, 0xf4f4f4, 0x222831, 0xff7b00, 0x9b5cff, 0x00c2a8, 0xc0c8d8];
export const PED_COLORS = [0xff8fa3, 0x8fd8ff, 0xffe066, 0x9dff8f, 0xd0a2ff, 0xffb347, 0xffffff, 0x7fb069];

// Five story missions. Each step is a place to reach, a thing to collect, or a wait.
export const MISSIONS = [
  {
    id: 1, title: 'Welcome Home, Mara', giver: 'Lena Kaur',
    briefing: ['Mara! You actually came back. The Marina crew needs a driver tonight.', 'Pick up the parcel at the Marina kiosk and bring it to Old Town. No police, no fuss.'],
    steps: [
      { type: 'goto', x: -120, z: 120, text: 'Pick up the parcel at the Marina kiosk' },
      { type: 'goto', x: -120, z: -40, text: 'Deliver the parcel to Old Town' },
    ],
    reward: 250,
  },
  {
    id: 2, title: 'The Getaway', giver: 'Lena Kaur',
    briefing: ['The Dockside crew tipped off Hale. Grab a fast car and get to Palm Heights.', 'If the police spot you, lose them — do not get arrested.'],
    steps: [
      { type: 'goto', x: 40, z: 0, text: 'Steal a fast car on the Neon Strip' },
      { type: 'goto', x: 120, z: -120, text: 'Reach the Palm Heights safehouse — wanted level will rise', wanted: 2 },
    ],
    reward: 400,
  },
  {
    id: 3, title: 'Rescue at Dockside', giver: 'Tomas Reyes',
    briefing: ['They grabbed my brother near the docks. You are the only one who drives like that.', 'Pick him up at Dockside and bring him to the Marina clinic. Watch the patrols.'],
    steps: [
      { type: 'goto', x: 120, z: 80, text: 'Find Tomas\'s brother at Dockside' },
      { type: 'goto', x: -120, z: 120, text: 'Drive him to the Marina clinic', wanted: 1 },
    ],
    reward: 500,
  },
  {
    id: 4, title: 'Turf Pickup', giver: 'Lena Kaur',
    briefing: ['Three cash drops are waiting around the Bay. Collect them before Hale\'s patrols do.', 'Marina, Neon Strip, then Dockside. Quick and quiet.'],
    steps: [
      { type: 'collect', x: -120, z: 140, text: 'Collect cash drop 1 of 3 — Marina' },
      { type: 'collect', x: 0, z: 40, text: 'Collect cash drop 2 of 3 — Neon Strip' },
      { type: 'collect', x: 120, z: 120, text: 'Collect cash drop 3 of 3 — Dockside' },
    ],
    reward: 600,
  },
  {
    id: 5, title: 'The Solmar Heist', giver: 'Mara Voss',
    briefing: ['This is it. The Bay Bank vault, then out through the Neon Strip.', 'Every police car in Solmar Bay will be coming. Drive like the Bay is yours — because it will be.'],
    steps: [
      { type: 'goto', x: 0, z: -40, text: 'Reach the Bay Bank on the Neon Strip' },
      { type: 'wait', seconds: 6, x: 0, z: -40, text: 'Crack the vault — hold your ground!' , wanted: 4 },
      { type: 'goto', x: -160, z: -120, text: 'Escape to the Beachfront hideout — lose the police', wanted: 3 },
    ],
    reward: 1500,
  },
];

export const COLLECTIBLE_SPOTS = [
  [-120, 60], [-80, 120], [40, 120], [120, 40], [160, -40], [80, -120],
  [-40, -120], [-120, -80], [120, 60], [-40, 80], [40, 20], [-80, 20],
];

export const PLAYER = { walkSpeed: 9, runSpeed: 14, health: 100 };
export const CAR = { maxSpeed: 30, accel: 22, brake: 34, turn: 2.1 };
