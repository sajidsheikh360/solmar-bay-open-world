// Screenshot scenes for ?shot=cover|chase|mission|night. Each stages a real
// gameplay state with the game's own systems — a driving car, traffic, police,
// a mission marker and dialogue — then the boot paints it.
import { createCar } from './vehicles.js';
import { startMission } from './missions.js';

function putPlayerInCar(game, x, z, angle) {
  const car = game.trafficCars.find((c) => !c.isPolice && c.driver === null) || game.trafficCars[0];
  car.x = x; car.z = z; car.angle = angle; car.speed = 16; car.driver = 'player';
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = angle;
  game.player.inCar = true;
  game.player.car = car;
  game.player.x = x; game.player.z = z; game.player.angle = angle;
  return car;
}

function placePolice(game, count) {
  // Police in front of the player, in view of the chase camera, closing in.
  const fx = Math.sin(game.player.angle);
  const fz = Math.cos(game.player.angle);
  const rx = fz;
  const rz = -fx;
  for (let i = 0; i < count; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const car = createCar(
      game.player.x + fx * (20 + i * 8) + rx * side * 7,
      game.player.z + fz * (20 + i * 8) + rz * side * 7,
      game.player.angle + Math.PI, 0x111111, true,
    );
    car.driver = 'police';
    car.speed = 14;
    game.scene.add(car.mesh);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    game.police.cars.push(car);
  }
}

export function stageShot(name, game) {
  const { player, missions, police, city } = game;
  player.health = 82;
  player.money = 1250;
  missions.index = 0;
  missions.active = null;
  police.wanted = 0;
  police.cars = [];
  player.hour = 10;
  player.inCar = false;
  player.car = null;

  if (name === 'chase') {
    // On foot, wanted 3, police cars closing in behind Mara.
    player.x = -20; player.z = 20; player.angle = Math.PI * 0.15;
    player.hour = 15;
    police.wanted = 3;
    placePolice(game, 3);
    player.wanted = 3;
    return { dialogue: { who: 'Lena Kaur', text: 'Mara, Hale\'s patrols are on you — run for the Marina, do not stop!' } };
  }
  if (name === 'mission') {
    // Mission 2 in progress: getaway drive, marker and objective on the HUD.
    putPlayerInCar(game, 20, 40, Math.PI / 2);
    player.hour = 17;
    missions.index = 1;
    startMission(missions, () => {});
    player.wanted = 1;
    police.wanted = 1;
    placePolice(game, 1);
    const step = missions.active ? missions.active.mission.steps[0] : null;
    if (step) { city.marker.visible = true; city.marker.position.set(step.x, 0, step.z); }
    return { dialogue: { who: 'Lena Kaur', text: 'Steal a fast car on the Neon Strip and get to Palm Heights — fast!' } };
  }
  if (name === 'night') {
    // Night on the Neon Strip: right under the neon signs at the central
    // crossroads, so they fill the top of the frame ahead of the car.
    putPlayerInCar(game, 0, -38, Math.PI);
    player.hour = 21.5;
    player.wanted = 1;
    police.wanted = 1;
    placePolice(game, 1);
    return { dialogue: { who: 'Mara Voss', text: 'The Strip never sleeps — and neither does Hale.' } };
  }
  // cover: driving fast down the central road at noon, traffic and HUD everywhere.
  putPlayerInCar(game, 0, 140, Math.PI);
  player.hour = 11;
  missions.index = 0;
  startMission(missions, () => {});
  player.wanted = 0;
  return { dialogue: { who: 'Lena Kaur', text: 'Pick up the parcel at the Marina kiosk and bring it to Old Town.' } };
}
