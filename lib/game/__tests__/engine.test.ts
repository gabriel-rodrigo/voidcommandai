import { describe, it, expect } from "vitest";
import {
  createInitialState,
  createPlayer,
  createFleet,
  createAIFleet,
  createPerson,
  updateGame,
  startExecutionPhase,
  processAI,
} from "../engine";
import { SHIP_TYPES, SCENE_WIDTH, SCENE_HEIGHT, FLEET_SIZE } from "../constants";
import { Bullet, Difficulty, GameState, Player } from "../types";

describe("Game Engine", () => {
  describe("createInitialState", () => {
    it("creates a valid initial state", () => {
      const state = createInitialState("normal");
      expect(state.status).toBe("waiting");
      expect(state.mode).toBe("single");
      expect(state.difficulty).toBe("normal");
      expect(state.phase).toBe("programming");
      expect(state.currentTurn).toBe(1);
      expect(state.maxTurns).toBe(50);
    });

    it("accepts different difficulties", () => {
      const easy = createInitialState("easy");
      const hard = createInitialState("hard");
      expect(easy.difficulty).toBe("easy");
      expect(hard.difficulty).toBe("hard");
    });
  });

  describe("createPlayer", () => {
    it("creates a player with correct defaults", () => {
      const player = createPlayer("p1", 1, "Test");
      expect(player.id).toBe("p1");
      expect(player.slot).toBe(1);
      expect(player.name).toBe("Test");
      expect(player.credits).toBe(150);
      expect(player.persons).toHaveLength(0);
      expect(player.stats.damageDealt).toBe(0);
    });
  });

  describe("createPerson", () => {
    it("creates a ship with correct stats from ship type", () => {
      const ship = createPerson("Unit 1", "wall", 100, 200, 0);
      expect(ship.name).toBe("Unit 1");
      expect(ship.typeId).toBe("wall");
      expect(ship.life).toBe(200);
      expect(ship.maxLife).toBe(200);
      expect(ship.speed).toBe(50);
      expect(ship.defense).toBe(20);
      expect(ship.moveDistance).toBe(100);
      expect(ship.weapons).toHaveLength(1);
      expect(ship.weapons[0].damage).toBe(28);
      expect(ship.weapons[0].range).toBe(260);
    });

    it("applies powerups correctly", () => {
      const ship = createPerson("Unit 1", "vanguard", 100, 200, 0, [
        "shield_upgrade",
        "weapon_upgrade",
      ]);
      // Vanguard base defense = 12, +15 from shield = 27
      expect(ship.defense).toBe(27);
      // Vanguard base damage = 24, +15 from weapon = 39
      expect(ship.weapons[0].damage).toBe(39);
    });
  });

  describe("createFleet", () => {
    it("creates correct number of ships for player", () => {
      const player = createPlayer("p1", 1, "Test");
      const fleet = createFleet(player, ["wall", "needle", "vanguard"]);
      expect(fleet).toHaveLength(3);
      expect(fleet[0].typeId).toBe("wall");
      expect(fleet[1].typeId).toBe("needle");
      expect(fleet[2].typeId).toBe("vanguard");
    });

    it("positions player 1 ships at bottom", () => {
      const player = createPlayer("p1", 1, "Test");
      const fleet = createFleet(player, ["vanguard"]);
      expect(fleet[0].y).toBeGreaterThan(SCENE_HEIGHT / 2);
    });

    it("positions player 2 ships at top", () => {
      const player = createPlayer("p2", 2, "AI");
      const fleet = createFleet(player, ["vanguard"]);
      expect(fleet[0].y).toBeLessThan(SCENE_HEIGHT / 2);
    });
  });

  describe("createAIFleet", () => {
    it("creates 2 ships for easy difficulty", () => {
      const fleet = createAIFleet("easy");
      expect(fleet).toHaveLength(2);
    });

    it("creates 3 ships for normal difficulty", () => {
      const fleet = createAIFleet("normal");
      expect(fleet).toHaveLength(3);
    });

    it("creates 3 ships for hard difficulty", () => {
      const fleet = createAIFleet("hard");
      expect(fleet).toHaveLength(3);
    });
  });

  describe("processAI", () => {
    it("sets AI player as ready after processing", () => {
      const state = setupGameState("normal");
      processAI(state);
      expect(state.players["ai-player"].isReady).toBe(true);
    });

    it("assigns pending actions to AI ships", () => {
      const state = setupGameState("normal");
      processAI(state);
      const aiShips = state.players["ai-player"].persons;
      for (const ship of aiShips) {
        if (ship.life > 0) {
          expect(ship.pendingMove).toBeDefined();
        }
      }
    });
  });

  describe("startExecutionPhase", () => {
    it("changes phase to executing", () => {
      const state = setupGameState("normal");
      const bullets: Bullet[] = [];

      // Set pending actions
      const human = state.players["human-player"];
      for (const p of human.persons) {
        p.pendingMove = { x: p.x + 50, y: p.y - 50 };
        p.pendingFire = { x: SCENE_WIDTH / 2, y: 100 };
      }
      human.isReady = true;
      processAI(state);

      startExecutionPhase(state, bullets);
      expect(state.phase).toBe("executing");
    });

    it("creates bullets for ships with pending fire", () => {
      const state = setupGameState("normal");
      const bullets: Bullet[] = [];

      const human = state.players["human-player"];
      for (const p of human.persons) {
        p.pendingMove = { x: p.x, y: p.y };
        p.pendingFire = { x: SCENE_WIDTH / 2, y: 100 };
      }
      human.isReady = true;
      processAI(state);

      startExecutionPhase(state, bullets);
      expect(bullets.length).toBeGreaterThan(0);
    });
  });

  describe("updateGame", () => {
    it("processes a tick without errors", () => {
      const state = setupGameState("normal");
      const bullets: Bullet[] = [];
      const events = updateGame(state, bullets);
      expect(Array.isArray(events)).toBe(true);
    });

    it("does not process when game is not playing", () => {
      const state = createInitialState("normal");
      state.status = "waiting";
      const bullets: Bullet[] = [];
      const events = updateGame(state, bullets);
      expect(events).toHaveLength(0);
    });
  });
});

// Helper to create a full game state for testing
function setupGameState(difficulty: Difficulty): GameState {
  const state = createInitialState(difficulty);
  const human = createPlayer("human-player", 1, "Commander");
  human.persons = createFleet(human, ["vanguard", "wall", "needle"]);

  const ai = createPlayer("ai-player", 2, "AI Player");
  ai.persons = createAIFleet(difficulty);

  state.players["human-player"] = human;
  state.players["ai-player"] = ai;
  state.status = "playing";
  state.phase = "programming";

  return state;
}
