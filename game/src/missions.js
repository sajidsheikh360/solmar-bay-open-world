// Story missions and side work for Solmar Bay: five missions in order, each
// with steps, dialogue, a glowing marker, rewards, plus taxi fares and
// collectible sun-coins scattered around the city.
import { MISSIONS, COLLECTIBLE_SPOTS } from './config.js';

export function createMissions() {
  return {
    index: 0, // next mission to start (0-based)
    active: null, // { mission, stepIndex, waitLeft }
    dialogue: [],
    dialogueIndex: 0,
    collectibles: COLLECTIBLE_SPOTS.map(([x, z]) => ({ x, z, taken: false })),
    taxi: null, // { pickupX, pickupZ, destX, destZ, state }
    taxiTimer: 20,
    completedCount: 0,
  };
}

export function currentMission(missions) {
  return MISSIONS[missions.index] || null;
}

export function startMission(missions, onDialogue) {
  const m = currentMission(missions);
  if (!m || missions.active) return null;
  missions.active = { mission: m, stepIndex: 0, waitLeft: 0 };
  missions.dialogue = [...m.briefing];
  missions.dialogueIndex = 0;
  if (onDialogue) onDialogue(missions.dialogue[0], m.giver);
  return m;
}

export function missionStep(missions) {
  if (!missions.active) return null;
  return missions.active.mission.steps[missions.active.stepIndex] || null;
}

export function missionObjectiveText(missions) {
  if (missions.active) {
    const step = missionStep(missions);
    return step ? step.text : '';
  }
  const m = currentMission(missions);
  if (m) return `Press M to start: ${m.title}`;
  return 'All story missions complete — free roam Solmar Bay!';
}

// Advance the active mission. Returns an event: null | 'step' | 'complete'.
export function updateMissions(missions, player, dt, onEvent) {
  if (!missions.active) {
    // Taxi fares appear while free-roaming.
    missions.taxiTimer -= dt;
    if (!missions.taxi && missions.taxiTimer <= 0) {
      missions.taxi = {
        pickupX: player.x + 40, pickupZ: player.z - 30,
        destX: player.x - 60, destZ: player.z + 80, state: 'pickup',
      };
      missions.taxiTimer = 45;
      if (onEvent) onEvent('taxi', 'Taxi fare nearby — pick up the passenger!');
    }
    return null;
  }
  const step = missionStep(missions);
  if (!step) return null;
  const dist = Math.hypot(player.x - step.x, player.z - step.z);
  if (step.type === 'wait') {
    if (dist < 12) {
      missions.active.waitLeft += dt;
      if (missions.active.waitLeft >= (step.seconds || 5)) return advanceStep(missions, onEvent);
    }
    return null;
  }
  if (dist < 8) {
    if (step.wanted && onEvent) onEvent('wanted', step.wanted);
    return advanceStep(missions, onEvent);
  }
  return null;
}

function advanceStep(missions, onEvent) {
  missions.active.stepIndex += 1;
  missions.active.waitLeft = 0;
  if (missions.active.stepIndex >= missions.active.mission.steps.length) {
    const m = missions.active.mission;
    missions.active = null;
    missions.index += 1;
    missions.completedCount += 1;
    if (onEvent) onEvent('complete', m);
    return 'complete';
  }
  if (onEvent) onEvent('step', missionStep(missions).text);
  return 'step';
}

export function nextDialogue(missions, onDialogue) {
  if (missions.dialogueIndex + 1 < missions.dialogue.length) {
    missions.dialogueIndex += 1;
    if (onDialogue) onDialogue(missions.dialogue[missions.dialogueIndex], missions.active ? missions.active.mission.giver : 'Lena Kaur');
    return true;
  }
  return false;
}
