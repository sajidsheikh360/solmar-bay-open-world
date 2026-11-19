// Story missions and side work for Solmar Bay. Missions run in order from
// config.js; each objective is a place to reach, a car to steal, or an
// escape. Completing one pays out and starts the next, with dialogue.
import { MISSIONS, ROADS, distance2D } from './config.js';
import { addWanted } from './police.js';

export function createMissionState() {
  return {
    index: 0,
    objective: 0,
    done: false,
    allDone: false,
    passenger: false,
    marker: null,
    taxi: null,
    taxiTimer: 0,
  };
}

export function currentMission(state) {
  return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
}

export function currentObjective(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  return mission.objectives[state.objective] || null;
}

export function missionLabel(state) {
  const mission = currentMission(state);
  if (!mission) return 'All missions complete — Solmar Bay is yours, Mara.';
  const objective = currentObjective(state);
  return `${mission.title}: ${objective ? objective.label : ''}`;
}

export function startMission(game, index) {
  game.missions.index = index;
  game.missions.objective = 0;
  game.missions.done = false;
  const mission = currentMission(game.missions);
  if (mission && game.hud) {
    game.hud.setDialogue(`${mission.giver}: ${mission.briefing}`);
    game.hud.toast(`Mission ${mission.id} — ${mission.title}`);
  }
  if (mission && mission.id === 5) addWanted(game, 2, 'bank alarm');
}

export function updateMissions(game, dt) {
  const mission = currentMission(game.missions);
  if (mission) {
    const objective = currentObjective(game.missions);
    if (objective) {
      if (objective.kind === 'car') {
        if (game.player.inCar) completeObjective(game);
      } else if (objective.kind === 'goto' || objective.kind === 'escape') {
        const dist = distance2D(game.player.pos.x, game.player.pos.z, objective.x, objective.z);
        if (objective.needsCar && !game.player.inCar) {
          // Waiting for the player to be in a car — the marker stays put.
        } else if (dist < 7) {
          if (mission.id === 3 && game.missions.objective === 0) {
            game.missions.passenger = true;
            if (game.hud) game.hud.setDialogue('Lena: Thanks, Mara — drive, and do not stop for anyone.');
          }
          completeObjective(game);
        }
      }
    }
  }

  // Taxi side job: a passenger waits at the stand; drive them to their stop.
  const taxi = game.missions.taxi;
  if (!taxi) {
    game.missions.taxiTimer += dt;
    if (game.missions.taxiTimer > 25) {
      game.missions.taxiTimer = 0;
      // Taxi destination: a random road intersection, so it is reachable.
      const destLine = ROADS[Math.floor(Math.random() * ROADS.length)];
      const destCross = ROADS[Math.floor(Math.random() * ROADS.length)];
      game.missions.taxi = {
        stage: 'wait',
        x: 50,
        z: 0,
        destX: destLine,
        destZ: destCross,
      };
      if (game.hud) game.hud.toast('Taxi fare waiting at the Neon Strip stand');
    }
  } else if (taxi.stage === 'wait') {
    if (game.player.inCar && distance2D(game.player.pos.x, game.player.pos.z, taxi.x, taxi.z) < 8) {
      taxi.stage = 'ride';
      if (game.hud) {
        game.hud.setDialogue('Passenger: Take me across town — and step on it.');
        game.hud.toast('Taxi passenger aboard — drive to the gold marker');
      }
    }
  } else if (distance2D(game.player.pos.x, game.player.pos.z, taxi.destX, taxi.destZ) < 8) {
    game.player.money += 150;
    game.audio.jingle();
    if (game.hud) game.hud.toast('Taxi fare complete — +$150');
    game.missions.taxi = null;
    game.missions.taxiTimer = 0;
  }
}

function completeObjective(game) {
  const mission = currentMission(game.missions);
  game.missions.objective += 1;
  game.audio.pickup();
  if (game.missions.objective >= mission.objectives.length) {
    game.player.money += mission.reward;
    game.audio.jingle();
    if (game.hud) {
      game.hud.toast(`Mission complete — +$${mission.reward}`);
      game.hud.setDialogue(`${mission.giver}: Nice work, Mara. That is $${mission.reward} in your pocket.`);
    }
    game.missions.index += 1;
    game.missions.objective = 0;
    if (game.missions.index >= MISSIONS.length) {
      game.missions.allDone = true;
      if (game.hud) game.hud.setDialogue('Mara: Every job done. Solmar Bay is mine now.');
    } else {
      const next = currentMission(game.missions);
      if (game.hud) game.hud.setDialogue(`${next.giver}: ${next.briefing}`);
    }
  }
}
