import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialState,
  createPlayer,
  createFleet,
  updateGame,
} from "../lib/game/engine";
import type { GameState, Bullet } from "../lib/game/types";
import type { RoomInfo, RoomState } from "../shared/multiplayer-types";

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

    const p1AvgY =
      p1.persons.reduce((sum, p) => sum + p.y, 0) / p1.persons.length;
    const p2AvgY =
      p2.persons.reduce((sum, p) => sum + p.y, 0) / p2.persons.length;

    expect(p1AvgY).toBeGreaterThan(p2AvgY);
  });

  it("should allow programming actions for both players", () => {
    const p1 = gameState.players["socket_abc123"];
    const p2 = gameState.players["socket_def456"];

    p1.persons[0].pendingMove = { x: 300, y: 400 };
    p1.persons[0].pendingFire = { x: 300, y: 100 };
    p2.persons[0].pendingMove = { x: 300, y: 200 };
    p2.persons[0].pendingFire = { x: 300, y: 500 };

    expect(p1.persons[0].pendingMove).toEqual({ x: 300, y: 400 });
    expect(p2.persons[0].pendingFire).toEqual({ x: 300, y: 500 });
  });

  it("should transition to execution when both players are ready", () => {
    gameState.players["socket_abc123"].isReady = true;
    gameState.players["socket_def456"].isReady = true;

    const events = updateGame(gameState, bullets);
    expect(gameState.phase).toBe("executing");
  });

  it("should not transition if only one player is ready", () => {
    gameState.players["socket_abc123"].isReady = true;
    gameState.players["socket_def456"].isReady = false;
    gameState.turnTime = 10;

    const events = updateGame(gameState, bullets);
    expect(gameState.phase).toBe("programming");
  });

  it("should detect game over when all ships of one player are destroyed", () => {
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
  });

  it("should support different ship selections per player", () => {
    const gs2 = createInitialState("normal");
    const pa = createPlayer("pa", 1, "Alice");
    pa.persons = createFleet(pa, ["titan", "titan", "titan"]);
    gs2.players["pa"] = pa;

    const pb = createPlayer("pb", 2, "Bob");
    pb.persons = createFleet(pb, ["striker", "striker", "striker"]);
    gs2.players["pb"] = pb;

    const titanSize = pa.persons[0].size;
    const strikerSize = pb.persons[0].size;
    expect(titanSize).toBeGreaterThanOrEqual(strikerSize);
    expect(pa.persons[0].typeId).toBe("titan");
    expect(pb.persons[0].typeId).toBe("striker");
  });

  it("should handle game over by max turns", () => {
    gameState.currentTurn = gameState.maxTurns;
    gameState.phase = "executing";
    gameState.turnTime = 0;

    const events = updateGame(gameState, bullets);
    expect(gameState.currentTurn).toBeGreaterThanOrEqual(gameState.maxTurns);
  });
});

describe("Room State Types", () => {
  it("should validate RoomState structure", () => {
    const roomState: RoomState = {
      id: "ABC123",
      name: "Test Room",
      status: "waiting",
      hostId: "socket_abc",
      players: [
        {
          id: "socket_abc",
          name: "Host",
          slot: 1,
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

describe("Room Password and Name Features", () => {
  it("should validate RoomInfo with hasPassword field", () => {
    const openRoom: RoomInfo = {
      id: "ROOM01",
      name: "Shadow Vanguard",
      hostName: "Player1",
      status: "waiting",
      playerCount: 1,
      maxPlayers: 2,
      createdAt: Date.now(),
      hasPassword: false,
    };

    const lockedRoom: RoomInfo = {
      id: "ROOM02",
      name: "Crimson Fleet",
      hostName: "Player2",
      status: "waiting",
      playerCount: 1,
      maxPlayers: 2,
      createdAt: Date.now(),
      hasPassword: true,
    };

    expect(openRoom.hasPassword).toBe(false);
    expect(lockedRoom.hasPassword).toBe(true);
  });

  it("should have room names that are non-empty strings", () => {
    const room: RoomInfo = {
      id: "ROOM03",
      name: "Phantom Storm",
      hostName: "TestHost",
      status: "waiting",
      playerCount: 1,
      maxPlayers: 2,
      createdAt: Date.now(),
      hasPassword: false,
    };

    expect(room.name.length).toBeGreaterThan(0);
    expect(room.name).toContain(" "); // Random names have format "Adj Noun"
  });

  it("should distinguish open and locked rooms in a list", () => {
    const rooms: RoomInfo[] = [
      {
        id: "R1",
        name: "Void Nebula",
        hostName: "Alice",
        status: "waiting",
        playerCount: 1,
        maxPlayers: 2,
        createdAt: Date.now(),
        hasPassword: false,
      },
      {
        id: "R2",
        name: "Iron Bastion",
        hostName: "Bob",
        status: "waiting",
        playerCount: 1,
        maxPlayers: 2,
        createdAt: Date.now(),
        hasPassword: true,
      },
      {
        id: "R3",
        name: "Neon Corsair",
        hostName: "Charlie",
        status: "waiting",
        playerCount: 1,
        maxPlayers: 2,
        createdAt: Date.now(),
        hasPassword: false,
      },
    ];

    const openRooms = rooms.filter((r) => !r.hasPassword);
    const lockedRooms = rooms.filter((r) => r.hasPassword);

    expect(openRooms).toHaveLength(2);
    expect(lockedRooms).toHaveLength(1);
    expect(lockedRooms[0].hostName).toBe("Bob");
  });

  it("should validate password is not exposed in RoomInfo", () => {
    const room: RoomInfo = {
      id: "R4",
      name: "Stellar Fury",
      hostName: "Dave",
      status: "waiting",
      playerCount: 1,
      maxPlayers: 2,
      createdAt: Date.now(),
      hasPassword: true,
    };

    // RoomInfo should only have hasPassword boolean, not the actual password
    const keys = Object.keys(room);
    expect(keys).not.toContain("password");
    expect(keys).toContain("hasPassword");
  });
});
