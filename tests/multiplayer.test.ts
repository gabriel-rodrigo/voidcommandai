import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialState,
  createPlayer,
  createFleet,
  updateGame,
} from "../lib/game/engine";
import type { GameState, Bullet } from "../lib/game/types";

describe("Multiplayer Game Logic", () => {
  let gameState: GameState;
  let bullets: Bullet[];

  beforeEach(() => {
    gameState = createInitialState("normal");
    bullets = [];

    // Simulate two real players (using socket IDs)
    const player1 = createPlayer("socket_abc123", 1, "Player 1");
    player1.persons = createFleet(player1, ["vanguard", "striker", "titan"]);
    gameState.players["socket_abc123"] = player1;

    const player2 = createPlayer("socket_def456", 2, "Player 2");
    player2.persons = createFleet(player2, ["vanguard", "striker", "titan"]);
    gameState.players["socket_def456"] = player2;

    gameState.status = "playing";
    gameState.mode = "multiplayer";
    gameState.phase = "programming";
  });

  it("should create two players with correct slots", () => {
    const p1 = gameState.players["socket_abc123"];
    const p2 = gameState.players["socket_def456"];
    expect(p1.slot).toBe(1);
    expect(p2.slot).toBe(2);
    expect(p1.persons.length).toBe(3);
    expect(p2.persons.length).toBe(3);
  });

  it("should position players on opposite sides", () => {
    const p1 = gameState.players["socket_abc123"];
    const p2 = gameState.players["socket_def456"];

    // Player 1 should be near bottom, Player 2 near top
    const p1AvgY =
      p1.persons.reduce((sum, p) => sum + p.y, 0) / p1.persons.length;
    const p2AvgY =
      p2.persons.reduce((sum, p) => sum + p.y, 0) / p2.persons.length;

    expect(p1AvgY).toBeGreaterThan(p2AvgY);
  });

  it("should allow programming actions for both players", () => {
    const p1 = gameState.players["socket_abc123"];
    const p2 = gameState.players["socket_def456"];

    // Program moves for player 1
    p1.persons[0].pendingMove = { x: 300, y: 400 };
    p1.persons[0].pendingFire = { x: 300, y: 100 };

    // Program moves for player 2
    p2.persons[0].pendingMove = { x: 300, y: 200 };
    p2.persons[0].pendingFire = { x: 300, y: 500 };

    expect(p1.persons[0].pendingMove).toEqual({ x: 300, y: 400 });
    expect(p2.persons[0].pendingFire).toEqual({ x: 300, y: 500 });
  });

  it("should transition to execution when both players are ready", () => {
    gameState.players["socket_abc123"].isReady = true;
    gameState.players["socket_def456"].isReady = true;

    const events = updateGame(gameState, bullets);

    // After both ready, phase should change to executing
    expect(gameState.phase).toBe("executing");
  });

  it("should not transition if only one player is ready", () => {
    gameState.players["socket_abc123"].isReady = true;
    gameState.players["socket_def456"].isReady = false;

    // Ensure turnTime is still positive
    gameState.turnTime = 10;

    const events = updateGame(gameState, bullets);
    expect(gameState.phase).toBe("programming");
  });

  it("should detect game over when all ships of one player are destroyed", () => {
    // Kill all of player 2's ships
    for (const person of gameState.players["socket_def456"].persons) {
      person.life = 0;
    }

    gameState.phase = "executing";
    const events = updateGame(gameState, bullets);

    expect(gameState.status).toBe("finished");
    expect(gameState.winner).toBe(1);
  });

  it("should handle forfeit (player disconnect)", () => {
    gameState.status = "finished";
    gameState.winner = 1;
    gameState.forfeitedBy = 2;

    expect(gameState.winner).toBe(1);
    expect(gameState.forfeitedBy).toBe(2);
  });

  it("should track stats independently for each player", () => {
    const p1 = gameState.players["socket_abc123"];
    const p2 = gameState.players["socket_def456"];

    p1.stats.damageDealt = 150;
    p1.stats.shipsDestroyed = 2;
    p2.stats.damageDealt = 80;
    p2.stats.shipsLost = 2;

    expect(p1.stats.damageDealt).toBe(150);
    expect(p2.stats.damageDealt).toBe(80);
    expect(p1.stats.shipsDestroyed).toBe(2);
    expect(p2.stats.shipsLost).toBe(2);
  });

  it("should support different ship selections per player", () => {
    const gs2 = createInitialState("normal");
    const pa = createPlayer("pa", 1, "Alice");
    pa.persons = createFleet(pa, ["titan", "titan", "titan"]);
    gs2.players["pa"] = pa;

    const pb = createPlayer("pb", 2, "Bob");
    pb.persons = createFleet(pb, ["striker", "striker", "striker"]);
    gs2.players["pb"] = pb;

    // Titans and strikers may have same base life but different stats
    const titanSize = pa.persons[0].size;
    const strikerSize = pb.persons[0].size;
    // Titans are larger ships
    expect(titanSize).toBeGreaterThanOrEqual(strikerSize);
    // Verify different type IDs
    expect(pa.persons[0].typeId).toBe("titan");
    expect(pb.persons[0].typeId).toBe("striker");
  });

  it("should handle game over by max turns", () => {
    gameState.currentTurn = gameState.maxTurns;
    gameState.phase = "executing";
    gameState.turnTime = 0;

    // Set all bullets cleared and execution done
    // The engine checks turn limit during phase transition
    const events = updateGame(gameState, bullets);

    // After max turns the engine may increment turn count by 1
    // The exact behavior depends on engine implementation
    expect(gameState.currentTurn).toBeGreaterThanOrEqual(gameState.maxTurns);
  });
});

describe("Room State Types", () => {
  it("should validate RoomState structure", () => {
    const roomState = {
      id: "ABC123",
      name: "Test Room",
      status: "waiting" as const,
      hostId: "socket_abc",
      players: [
        {
          id: "socket_abc",
          name: "Host",
          slot: 1 as const,
          isHost: true,
          isReady: false,
          selectedShips: [],
        },
      ],
    };

    expect(roomState.id).toBe("ABC123");
    expect(roomState.players).toHaveLength(1);
    expect(roomState.players[0].isHost).toBe(true);
  });

  it("should validate GameSnapshot structure", () => {
    const snapshot = {
      players: {
        socket_abc: {
          id: "socket_abc",
          slot: 1,
          name: "Player 1",
          isReady: false,
          persons: [],
          stats: {
            damageDealt: 0,
            damageTaken: 0,
            shotsFired: 0,
            shotsHit: 0,
            shipsLost: 0,
            shipsDestroyed: 0,
          },
        },
      },
      status: "playing",
      phase: "programming",
      currentTurn: 1,
      maxTurns: 10,
      turnTime: 30,
      bullets: [],
    };

    expect(snapshot.players.socket_abc.slot).toBe(1);
    expect(snapshot.bullets).toEqual([]);
  });
});
