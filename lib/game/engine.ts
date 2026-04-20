import {
  GameState,
  GamePhase,
  Player,
  Person,
  Bullet,
  Vector2,
  Weapon,
  PlayerStats,
  GameEvent,
  Difficulty,
} from "./types";
import {
  SHIP_TYPES,
  SCENE_WIDTH,
  SCENE_HEIGHT,
  TICK_INTERVAL,
  BULLET_SPEED,
  CRITICAL_CHANCE,
  CRITICAL_MULTIPLIER,
  KILL_CREDITS,
  WIN_CREDITS,
  LOSE_CREDITS,
  PROGRAMMING_TIME,
  EXECUTION_TIME,
  MAX_TURNS,
  FLEET_OFFSETS,
  POWERUPS,
} from "./constants";

let _idCounter = 0;
function generateId(): string {
  _idCounter += 1;
  return `id_${Date.now()}_${_idCounter}`;
}

function createEmptyStats(): PlayerStats {
  return {
    damageDealt: 0,
    damageTaken: 0,
    shotsFired: 0,
    shotsHit: 0,
    shipsLost: 0,
    shipsDestroyed: 0,
  };
}

export function createPerson(
  name: string,
  typeId: string,
  x: number,
  y: number,
  angle: number,
  purchasedPowerups: string[] = []
): Person {
  const shipType = SHIP_TYPES[typeId] ?? SHIP_TYPES.vanguard;
  let defense = shipType.defense;
  let moveDistance = shipType.moveDistance;
  let damage = shipType.damage;

  for (const pId of purchasedPowerups) {
    const pu = POWERUPS[pId];
    if (!pu) continue;
    if (pu.effect === "defense") defense += pu.value;
    else if (pu.effect === "moveDistance") moveDistance += pu.value;
    else if (pu.effect === "damage") damage += pu.value;
  }

  return {
    id: generateId(),
    name,
    typeId,
    life: shipType.life,
    maxLife: shipType.life,
    speed: shipType.speed,
    size: shipType.size,
    defense,
    moveDistance,
    x,
    y,
    angle,
    targetX: x,
    targetY: y,
    weapons: [
      {
        id: generateId(),
        name: shipType.weaponName,
        damage,
        range: shipType.range,
        cooldown: 0,
        lastFired: 0,
      },
    ],
  };
}

export function createPlayer(
  id: string,
  slot: number,
  name: string,
  credits: number = 150
): Player {
  return {
    id,
    slot,
    name,
    persons: [],
    isReady: false,
    credits,
    powerups: [],
    stats: createEmptyStats(),
  };
}

export function createFleet(
  player: Player,
  shipTypeIds: string[]
): Person[] {
  const startX = SCENE_WIDTH / 2;
  const startY = player.slot === 1 ? SCENE_HEIGHT - 100 : 100;
  const angle = player.slot === 1 ? -Math.PI / 2 : Math.PI / 2;
  const yMul = player.slot === 1 ? 1 : -1;

  return shipTypeIds.map((typeId, i) => {
    const offset = FLEET_OFFSETS[i] ?? { x: 0, y: 0 };
    return createPerson(
      `Unit ${i + 1}`,
      typeId,
      startX + offset.x,
      startY + offset.y * yMul,
      angle,
      player.powerups
    );
  });
}

export function createInitialState(difficulty: Difficulty): GameState {
  return {
    players: {},
    status: "waiting",
    mode: "single",
    difficulty,
    turnTime: PROGRAMMING_TIME,
    phase: "programming",
    currentTurn: 1,
    maxTurns: MAX_TURNS,
  };
}

export function processAI(state: GameState): void {
  const aiPlayer = state.players["ai-player"];
  if (!aiPlayer || aiPlayer.isReady) return;
  if (state.status !== "playing" || state.phase !== "programming") return;

  const difficulty = state.difficulty ?? "normal";
  const humanPlayer = Object.values(state.players).find(
    (p) => p.id !== "ai-player"
  );
  const targets = humanPlayer
    ? humanPlayer.persons.filter((p) => p.life > 0)
    : [];

  for (const person of aiPlayer.persons) {
    if (person.life <= 0) continue;

    if (targets.length === 0) {
      person.pendingMove = {
        x: clamp(person.x + (Math.random() - 0.5) * 200, 50, SCENE_WIDTH - 50),
        y: clamp(person.y + (Math.random() - 0.5) * 200, 50, SCENE_HEIGHT - 50),
      };
      continue;
    }

    const closest = targets.reduce((a, b) =>
      dist(a, person) < dist(b, person) ? a : b
    );

    if (difficulty === "easy") {
      person.pendingMove = {
        x: clamp(person.x + (Math.random() - 0.5) * 200, 50, SCENE_WIDTH - 50),
        y: clamp(person.y + (Math.random() - 0.5) * 200, 50, SCENE_HEIGHT - 50),
      };
      if (Math.random() > 0.3) {
        const target = Math.random() > 0.4 ? closest : targets[Math.floor(Math.random() * targets.length)];
        person.pendingFire = { x: target.x, y: target.y };
      }
    } else if (difficulty === "hard") {
      const dx = closest.x - person.x;
      const dy = closest.y - person.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d > 250) {
        const moveDist = Math.min(person.moveDistance, d - 150);
        person.pendingMove = {
          x: d > 0 ? person.x + (dx / d) * moveDist : person.x,
          y: d > 0 ? person.y + (dy / d) * moveDist : person.y,
        };
      } else {
        const angle =
          Math.atan2(dy, dx) +
          (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
        const moveDist = person.moveDistance * 0.7;
        person.pendingMove = {
          x: clamp(person.x + Math.cos(angle) * moveDist, 50, SCENE_WIDTH - 50),
          y: clamp(person.y + Math.sin(angle) * moveDist, 50, SCENE_HEIGHT - 50),
        };
      }

      const weakest = targets.reduce((a, b) => (a.life < b.life ? a : b));
      person.pendingFire = { x: weakest.x, y: weakest.y };
    } else {
      // normal
      person.pendingMove = {
        x: clamp(person.x + (Math.random() - 0.5) * 200, 50, SCENE_WIDTH - 50),
        y: clamp(person.y + (Math.random() - 0.5) * 200, 50, SCENE_HEIGHT - 50),
      };
      person.pendingFire = { x: closest.x, y: closest.y };
    }
  }

  aiPlayer.isReady = true;
}

export function startExecutionPhase(
  state: GameState,
  bullets: Bullet[]
): GameEvent[] {
  state.phase = "executing";
  state.turnTime = EXECUTION_TIME;
  const events: GameEvent[] = [];

  for (const [playerId, player] of Object.entries(state.players)) {
    player.isReady = false;
    for (const person of player.persons) {
      if (person.life <= 0) continue;

      if (person.pendingMove) {
        const dx = person.pendingMove.x - person.x;
        const dy = person.pendingMove.y - person.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > person.moveDistance) {
          person.targetX = person.x + (dx / d) * person.moveDistance;
          person.targetY = person.y + (dy / d) * person.moveDistance;
        } else {
          person.targetX = person.pendingMove.x;
          person.targetY = person.pendingMove.y;
        }
        person.pendingMove = undefined;
      }

      if (person.pendingFire) {
        player.stats.shotsFired += 1;
        const damage = person.weapons[0]?.damage ?? 20;
        bullets.push({
          id: generateId(),
          x: person.x,
          y: person.y,
          targetX: person.pendingFire.x,
          targetY: person.pendingFire.y,
          speed: BULLET_SPEED,
          damage,
          ownerId: playerId,
          sourceId: person.id,
        });

        events.push({
          type: "fire",
          x: person.x,
          y: person.y,
          targetX: person.pendingFire.x,
          targetY: person.pendingFire.y,
          playerSlot: player.slot,
        });

        person.pendingFire = undefined;
      }
    }
  }

  return events;
}

export function updateGame(
  state: GameState,
  bullets: Bullet[]
): GameEvent[] {
  const dt = TICK_INTERVAL;
  const events: GameEvent[] = [];

  if (state.status !== "playing") return events;

  if (state.phase === "programming") {
    processAI(state);
    state.turnTime -= dt;

    const allReady = Object.values(state.players).every((p) => p.isReady);
    if (state.turnTime <= 0 || allReady) {
      events.push(...startExecutionPhase(state, bullets));
    }
  } else {
    // executing
    state.turnTime -= dt;

    // Move ships
    for (const player of Object.values(state.players)) {
      for (const person of player.persons) {
        if (person.life <= 0) continue;
        const dx = person.targetX - person.x;
        const dy = person.targetY - person.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) {
          const moveDist = person.speed * dt;
          if (moveDist >= d) {
            person.x = person.targetX;
            person.y = person.targetY;
          } else {
            person.x += (dx / d) * moveDist;
            person.y += (dy / d) * moveDist;
          }
          person.angle = Math.atan2(dy, dx);
        }
      }
    }

    // Ship collisions
    const aliveShips: Array<{ pid: string; ship: Person }> = [];
    for (const [pid, p] of Object.entries(state.players)) {
      for (const person of p.persons) {
        if (person.life > 0) aliveShips.push({ pid, ship: person });
      }
    }

    for (let i = 0; i < aliveShips.length; i++) {
      for (let j = i + 1; j < aliveShips.length; j++) {
        const { pid: pid1, ship: s1 } = aliveShips[i];
        const { pid: pid2, ship: s2 } = aliveShips[j];
        if (s1.life <= 0 || s2.life <= 0) continue;

        const d = dist(s1, s2);
        if (d < s1.size + s2.size) {
          const dmg1 = s2.maxLife;
          const dmg2 = s1.maxLife;
          s1.life -= dmg1;
          s2.life -= dmg2;

          const v1 = state.players[pid1];
          const v2 = state.players[pid2];
          if (v1) v1.stats.damageTaken += dmg1;
          if (v2) v2.stats.damageTaken += dmg2;

          events.push({ type: "hit", x: s1.x, y: s1.y, damage: dmg1, isCritical: true });
          events.push({ type: "hit", x: s2.x, y: s2.y, damage: dmg2, isCritical: true });

          if (s1.life <= 0) {
            s1.life = 0;
            if (v1) v1.stats.shipsLost += 1;
            if (v2 && pid1 !== pid2) {
              v2.stats.shipsDestroyed += 1;
              v2.stats.damageDealt += dmg1;
              v2.credits += KILL_CREDITS;
            }
            events.push({ type: "ship_destroyed", x: s1.x, y: s1.y, shipId: s1.id });
          }
          if (s2.life <= 0) {
            s2.life = 0;
            if (v2) v2.stats.shipsLost += 1;
            if (v1 && pid1 !== pid2) {
              v1.stats.shipsDestroyed += 1;
              v1.stats.damageDealt += dmg2;
              v1.credits += KILL_CREDITS;
            }
            events.push({ type: "ship_destroyed", x: s2.x, y: s2.y, shipId: s2.id });
          }
        }
      }
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const dx = bullet.targetX - bullet.x;
      const dy = bullet.targetY - bullet.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const moveDist = bullet.speed * dt;

      let hit = false;
      for (const [pid, player] of Object.entries(state.players)) {
        for (const person of player.persons) {
          if (person.life <= 0) continue;
          if (person.id === bullet.sourceId) continue;

          const pdx = person.x - bullet.x;
          const pdy = person.y - bullet.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

          if (pdist < person.size + 10) {
            const isCritical = Math.random() < CRITICAL_CHANCE;
            const baseDamage = isCritical
              ? bullet.damage * CRITICAL_MULTIPLIER
              : bullet.damage;
            const actualDamage = Math.max(1, Math.floor(baseDamage - person.defense));
            person.life -= actualDamage;

            const attacker = state.players[bullet.ownerId];
            if (attacker) {
              attacker.stats.damageDealt += actualDamage;
              attacker.stats.shotsHit += 1;
            }

            const victim = state.players[pid];
            if (victim) victim.stats.damageTaken += actualDamage;

            events.push({
              type: "hit",
              x: bullet.x,
              y: bullet.y,
              damage: actualDamage,
              isCritical,
            });

            if (person.life <= 0) {
              person.life = 0;
              if (victim) victim.stats.shipsLost += 1;
              if (attacker) {
                attacker.stats.shipsDestroyed += 1;
                attacker.credits += KILL_CREDITS;
              }
              events.push({
                type: "ship_destroyed",
                x: person.x,
                y: person.y,
                shipId: person.id,
              });
            }
            hit = true;
            break;
          }
        }
        if (hit) break;
      }

      if (hit || d < 5) {
        bullets.splice(i, 1);
      } else {
        bullet.x += (dx / d) * moveDist;
        bullet.y += (dy / d) * moveDist;
      }
    }

    // Turn end
    if (state.turnTime <= 0) {
      bullets.length = 0;
      state.currentTurn += 1;

      if (state.currentTurn > state.maxTurns) {
        finishGame(state, events);
      } else {
        state.phase = "programming";
        state.turnTime = PROGRAMMING_TIME;
      }
    }
  }

  // Check game over
  const alivePlayers = Object.values(state.players).filter((p) =>
    p.persons.some((u) => u.life > 0)
  );
  if (
    state.status === "playing" &&
    alivePlayers.length <= 1 &&
    Object.keys(state.players).length >= 2
  ) {
    state.status = "finished";
    state.winner = alivePlayers.length === 1 ? alivePlayers[0].slot : 0;
    awardCredits(state);
  }

  return events;
}

function finishGame(state: GameState, events: GameEvent[]): void {
  state.status = "finished";
  const playerShipCounts = Object.values(state.players).map((p) => ({
    slot: p.slot,
    count: p.persons.filter((u) => u.life > 0).length,
  }));
  playerShipCounts.sort((a, b) => b.count - a.count);

  if (
    playerShipCounts.length >= 2 &&
    playerShipCounts[0].count === playerShipCounts[1].count
  ) {
    state.winner = 0;
  } else {
    state.winner = playerShipCounts[0].slot;
  }
  awardCredits(state);
}

function awardCredits(state: GameState): void {
  for (const p of Object.values(state.players)) {
    if (state.winner && p.slot === state.winner) {
      p.credits += WIN_CREDITS;
    } else {
      p.credits += LOSE_CREDITS;
    }
  }
}

export function createAIFleet(difficulty: Difficulty): Person[] {
  const available = Object.keys(SHIP_TYPES);
  const numShips = difficulty === "easy" ? 2 : 3;
  const startX = SCENE_WIDTH / 2;
  const startY = 100;
  const angle = Math.PI / 2;

  const ships: Person[] = [];
  for (let i = 0; i < numShips; i++) {
    const typeId = available[Math.floor(Math.random() * available.length)];
    const offset = FLEET_OFFSETS[i] ?? { x: 0, y: 0 };
    ships.push(
      createPerson(
        `AI Unit ${i + 1}`,
        typeId,
        startX + offset.x,
        startY + offset.y * -1,
        angle
      )
    );
  }
  return ships;
}

// Helpers
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
