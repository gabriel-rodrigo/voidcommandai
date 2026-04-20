/**
 * Shared multiplayer types used by both server and client.
 * This file must remain free of server-only or client-only imports.
 */

export type RoomStatus = "waiting" | "selecting" | "playing" | "finished";

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: 2;
  createdAt: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  slot: 1 | 2;
  isHost: boolean;
  isReady: boolean;
  selectedShips: string[];
}

export interface RoomState {
  id: string;
  name: string;
  status: RoomStatus;
  players: RoomPlayer[];
  hostId: string;
}

/** Serialised game snapshot sent to clients each tick */
export interface GameSnapshot {
  players: Record<
    string,
    {
      id: string;
      slot: number;
      name: string;
      isReady: boolean;
      persons: Array<{
        id: string;
        name: string;
        typeId: string;
        life: number;
        maxLife: number;
        x: number;
        y: number;
        angle: number;
        targetX: number;
        targetY: number;
        size: number;
        pendingMove?: { x: number; y: number };
        pendingFire?: { x: number; y: number };
      }>;
      stats: {
        damageDealt: number;
        damageTaken: number;
        shotsFired: number;
        shotsHit: number;
        shipsLost: number;
        shipsDestroyed: number;
      };
    }
  >;
  status: string;
  phase: string;
  currentTurn: number;
  maxTurns: number;
  turnTime: number;
  winner?: number;
  bullets: Array<{
    id: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    speed: number;
    damage: number;
    ownerId: string;
  }>;
}

export interface GameEventData {
  type: "fire" | "hit" | "ship_destroyed";
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  damage?: number;
  isCritical?: boolean;
  shipId?: string;
  playerSlot?: number;
}

// ─── Socket Events ──────────────────────────────────────────────────────────

/** Client → Server events */
export interface ClientToServerEvents {
  /** Create a new room */
  "room:create": (data: { roomName: string; playerName: string }, cb: (res: { ok: boolean; roomId?: string; error?: string }) => void) => void;
  /** Join an existing room */
  "room:join": (data: { roomId: string; playerName: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  /** Leave current room */
  "room:leave": () => void;
  /** List available rooms */
  "room:list": (cb: (rooms: RoomInfo[]) => void) => void;
  /** Select ships for battle */
  "game:selectShips": (data: { ships: string[] }) => void;
  /** Mark ready (ships selected) */
  "game:ready": () => void;
  /** Program actions for a unit during programming phase */
  "game:programAction": (data: { personId: string; moveX: number; moveY: number; fireX: number; fireY: number }) => void;
  /** Confirm turn (all actions programmed) */
  "game:confirmTurn": () => void;
}

/** Server → Client events */
export interface ServerToClientEvents {
  /** Room state updated */
  "room:state": (state: RoomState) => void;
  /** Room list updated */
  "room:listUpdate": (rooms: RoomInfo[]) => void;
  /** Player joined the room */
  "room:playerJoined": (player: RoomPlayer) => void;
  /** Player left the room */
  "room:playerLeft": (playerId: string) => void;
  /** Game is starting (both players selected ships) */
  "game:start": () => void;
  /** Game state snapshot (sent each tick during execution) */
  "game:snapshot": (snapshot: GameSnapshot) => void;
  /** Game events (hits, explosions, etc.) */
  "game:events": (events: GameEventData[]) => void;
  /** Phase changed */
  "game:phaseChange": (data: { phase: string; turnTime: number; currentTurn: number }) => void;
  /** Game finished */
  "game:finished": (data: { winner: number; snapshot: GameSnapshot }) => void;
  /** Error message */
  "error": (message: string) => void;
}
