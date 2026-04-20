/**
 * Room Manager — manages multiplayer game rooms on the server.
 * Each room holds up to 2 players, handles ship selection, and runs
 * the authoritative game simulation during battle.
 */

import { Server, Socket } from "socket.io";
import {
  RoomInfo,
  RoomState,
  RoomPlayer,
  RoomStatus,
  GameSnapshot,
  GameEventData,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../shared/multiplayer-types";
import {
  createInitialState,
  createPlayer,
  createFleet,
  updateGame,
} from "../../lib/game/engine";
import { GameState, Bullet, GameEvent } from "../../lib/game/types";
import { TICK_INTERVAL, PROGRAMMING_TIME, TICK_RATE } from "../../lib/game/constants";

interface ServerRoom {
  id: string;
  name: string;
  status: RoomStatus;
  hostId: string;
  players: Map<string, RoomPlayer & { socketId: string }>;
  createdAt: number;
  /** Server-authoritative game state (only during playing) */
  gameState: GameState | null;
  bullets: Bullet[];
  tickInterval: ReturnType<typeof setInterval> | null;
}

const rooms = new Map<string, ServerRoom>();
/** Maps socket.id → roomId for quick lookup */
const socketToRoom = new Map<string, string>();

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function getRoomInfo(room: ServerRoom): RoomInfo {
  const host = Array.from(room.players.values()).find((p) => p.isHost);
  return {
    id: room.id,
    name: room.name,
    hostName: host?.name ?? "Unknown",
    status: room.status,
    playerCount: room.players.size,
    maxPlayers: 2,
    createdAt: room.createdAt,
  };
}

function getRoomState(room: ServerRoom): RoomState {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map(({ socketId, ...p }) => p),
  };
}

function buildSnapshot(room: ServerRoom): GameSnapshot {
  if (!room.gameState) throw new Error("No game state");
  const gs = room.gameState;
  const players: GameSnapshot["players"] = {};
  for (const [pid, p] of Object.entries(gs.players)) {
    players[pid] = {
      id: p.id,
      slot: p.slot,
      name: p.name,
      isReady: p.isReady,
      persons: p.persons.map((u) => ({
        id: u.id,
        name: u.name,
        typeId: u.typeId,
        life: u.life,
        maxLife: u.maxLife,
        x: u.x,
        y: u.y,
        angle: u.angle,
        targetX: u.targetX,
        targetY: u.targetY,
        size: u.size,
      })),
      stats: { ...p.stats },
    };
  }
  return {
    players,
    status: gs.status,
    phase: gs.phase,
    currentTurn: gs.currentTurn,
    maxTurns: gs.maxTurns,
    turnTime: gs.turnTime,
    winner: gs.winner,
    bullets: room.bullets.map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      targetX: b.targetX,
      targetY: b.targetY,
      speed: b.speed,
      damage: b.damage,
      ownerId: b.ownerId,
    })),
  };
}

function broadcastRoomState(io: Server, room: ServerRoom) {
  io.to(room.id).emit("room:state", getRoomState(room));
}

function broadcastRoomList(io: Server) {
  const list = Array.from(rooms.values())
    .filter((r) => r.status === "waiting")
    .map(getRoomInfo);
  io.emit("room:listUpdate", list);
}

function cleanupRoom(io: Server, room: ServerRoom) {
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
  for (const p of room.players.values()) {
    socketToRoom.delete(p.socketId);
  }
  rooms.delete(room.id);
  broadcastRoomList(io);
}

function startGameLoop(io: Server, room: ServerRoom) {
  if (!room.gameState) return;

  const tickMs = 1000 / TICK_RATE;
  room.tickInterval = setInterval(() => {
    if (!room.gameState) {
      if (room.tickInterval) clearInterval(room.tickInterval);
      return;
    }

    const events = updateGame(room.gameState, room.bullets);

    // Broadcast snapshot
    const snapshot = buildSnapshot(room);
    io.to(room.id).emit("game:snapshot", snapshot);

    if (events.length > 0) {
      const eventData: GameEventData[] = events.map((e) => ({
        type: e.type,
        x: e.x,
        y: e.y,
        targetX: e.targetX,
        targetY: e.targetY,
        damage: e.damage,
        isCritical: e.isCritical,
        shipId: e.shipId,
        playerSlot: e.playerSlot,
      }));
      io.to(room.id).emit("game:events", eventData);
    }

    // Phase change detection
    if (room.gameState.phase === "programming") {
      // Check if both players are ready
      const allReady = Object.values(room.gameState.players).every((p) => p.isReady);
      if (allReady || room.gameState.turnTime <= 0) {
        // Engine handles phase transition in updateGame
      }
    }

    // Notify phase changes
    io.to(room.id).emit("game:phaseChange", {
      phase: room.gameState.phase,
      turnTime: room.gameState.turnTime,
      currentTurn: room.gameState.currentTurn,
    });

    // Game over
    if (room.gameState.status === "finished") {
      io.to(room.id).emit("game:finished", {
        winner: room.gameState.winner ?? 0,
        snapshot: buildSnapshot(room),
      });
      if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
      }
      room.status = "finished";
      broadcastRoomList(io);
    }
  }, tickMs);
}

export function registerMultiplayerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.on("connection", (socket) => {
    console.log(`[MP] Socket connected: ${socket.id}`);

    // ─── Room: List ──────────────────────────────────────────────────
    socket.on("room:list", (cb) => {
      const list = Array.from(rooms.values())
        .filter((r) => r.status === "waiting")
        .map(getRoomInfo);
      cb(list);
    });

    // ─── Room: Create ────────────────────────────────────────────────
    socket.on("room:create", ({ roomName, playerName }, cb) => {
      // Leave any existing room first
      leaveCurrentRoom(io, socket);

      const roomId = generateRoomId();
      const player: RoomPlayer & { socketId: string } = {
        id: socket.id,
        name: playerName,
        slot: 1,
        isHost: true,
        isReady: false,
        selectedShips: [],
        socketId: socket.id,
      };

      const room: ServerRoom = {
        id: roomId,
        name: roomName || `${playerName}'s Room`,
        status: "waiting",
        hostId: socket.id,
        players: new Map([[socket.id, player]]),
        createdAt: Date.now(),
        gameState: null,
        bullets: [],
        tickInterval: null,
      };

      rooms.set(roomId, room);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      cb({ ok: true, roomId });
      broadcastRoomState(io, room);
      broadcastRoomList(io);
    });

    // ─── Room: Join ──────────────────────────────────────────────────
    socket.on("room:join", ({ roomId, playerName }, cb) => {
      const room = rooms.get(roomId);
      if (!room) {
        cb({ ok: false, error: "Room not found" });
        return;
      }
      if (room.status !== "waiting") {
        cb({ ok: false, error: "Game already in progress" });
        return;
      }
      if (room.players.size >= 2) {
        cb({ ok: false, error: "Room is full" });
        return;
      }

      // Leave any existing room first
      leaveCurrentRoom(io, socket);

      const player: RoomPlayer & { socketId: string } = {
        id: socket.id,
        name: playerName,
        slot: 2,
        isHost: false,
        isReady: false,
        selectedShips: [],
        socketId: socket.id,
      };

      room.players.set(socket.id, player);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      // Notify existing players
      io.to(roomId).emit("room:playerJoined", {
        id: player.id,
        name: player.name,
        slot: player.slot,
        isHost: player.isHost,
        isReady: player.isReady,
        selectedShips: player.selectedShips,
      });

      // Both players present → move to ship selection
      if (room.players.size === 2) {
        room.status = "selecting";
      }

      cb({ ok: true });
      broadcastRoomState(io, room);
      broadcastRoomList(io);
    });

    // ─── Room: Leave ─────────────────────────────────────────────────
    socket.on("room:leave", () => {
      leaveCurrentRoom(io, socket);
    });

    // ─── Game: Select Ships ──────────────────────────────────────────
    socket.on("game:selectShips", ({ ships }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.status !== "selecting") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      player.selectedShips = ships;
      broadcastRoomState(io, room);
    });

    // ─── Game: Ready ─────────────────────────────────────────────────
    socket.on("game:ready", () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.status !== "selecting") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      player.isReady = true;
      broadcastRoomState(io, room);

      // Check if both players are ready
      const allReady = Array.from(room.players.values()).every(
        (p) => p.isReady && p.selectedShips.length > 0
      );

      if (allReady && room.players.size === 2) {
        // Start the game!
        room.status = "playing";
        const gs = createInitialState("normal");
        gs.mode = "single" as any; // We reuse the type but it's multiplayer

        const playerArr = Array.from(room.players.values());
        for (const rp of playerArr) {
          const gp = createPlayer(rp.id, rp.slot, rp.name);
          gp.persons = createFleet(gp, rp.selectedShips);
          gs.players[rp.id] = gp;
        }

        gs.status = "playing";
        gs.phase = "programming";
        room.gameState = gs;
        room.bullets = [];

        io.to(room.id).emit("game:start");
        broadcastRoomState(io, room);
        broadcastRoomList(io);

        // Send initial snapshot
        const snapshot = buildSnapshot(room);
        io.to(room.id).emit("game:snapshot", snapshot);

        // Start the game loop
        startGameLoop(io, room);
      }
    });

    // ─── Game: Program Action ────────────────────────────────────────
    socket.on("game:programAction", ({ personId, moveX, moveY, fireX, fireY }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.gameState || room.gameState.phase !== "programming") return;

      const player = room.gameState.players[socket.id];
      if (!player) return;

      const person = player.persons.find((p) => p.id === personId);
      if (!person || person.life <= 0) return;

      person.pendingMove = { x: moveX, y: moveY };
      person.pendingFire = { x: fireX, y: fireY };
    });

    // ─── Game: Confirm Turn ──────────────────────────────────────────
    socket.on("game:confirmTurn", () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.gameState || room.gameState.phase !== "programming") return;

      const player = room.gameState.players[socket.id];
      if (!player) return;

      player.isReady = true;

      // Broadcast updated snapshot so both players see readiness
      const snapshot = buildSnapshot(room);
      io.to(room.id).emit("game:snapshot", snapshot);
    });

    // ─── Disconnect ──────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[MP] Socket disconnected: ${socket.id}`);
      leaveCurrentRoom(io, socket);
    });
  });
}

function leaveCurrentRoom(
  io: Server,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socket.id);
    return;
  }

  room.players.delete(socket.id);
  socketToRoom.delete(socket.id);
  socket.leave(roomId);

  io.to(roomId).emit("room:playerLeft", socket.id);

  if (room.players.size === 0) {
    cleanupRoom(io, room);
  } else {
    // If game was in progress, end it (opponent left)
    if (room.status === "playing" && room.gameState) {
      const remaining = Array.from(room.players.values())[0];
      room.gameState.status = "finished";
      room.gameState.winner = remaining.slot;
      room.gameState.forfeitedBy = remaining.slot === 1 ? 2 : 1;

      io.to(room.id).emit("game:finished", {
        winner: remaining.slot,
        snapshot: buildSnapshot(room),
      });

      if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
      }
      room.status = "finished";
    } else if (room.status === "selecting") {
      // Go back to waiting
      room.status = "waiting";
      for (const p of room.players.values()) {
        p.isReady = false;
      }
    }

    // Transfer host if needed
    if (room.hostId === socket.id) {
      const newHost = Array.from(room.players.values())[0];
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
      }
    }

    broadcastRoomState(io, room);
    broadcastRoomList(io);
  }
}
