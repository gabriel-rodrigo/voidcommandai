export interface Vector2 {
  x: number;
  y: number;
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  range: number;
  cooldown: number;
  lastFired: number;
}

export interface ShipType {
  id: string;
  name: string;
  life: number;
  speed: number;
  size: number;
  defense: number;
  moveDistance: number;
  weaponName: string;
  damage: number;
  range: number;
  description: string;
}

export interface Person {
  id: string;
  name: string;
  typeId: string;
  life: number;
  maxLife: number;
  speed: number;
  size: number;
  defense: number;
  moveDistance: number;
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  weapons: Weapon[];
  pendingMove?: Vector2;
  pendingFire?: Vector2;
}

export interface PlayerStats {
  damageDealt: number;
  damageTaken: number;
  shotsFired: number;
  shotsHit: number;
  shipsLost: number;
  shipsDestroyed: number;
}

export interface Player {
  id: string;
  slot: number;
  name: string;
  persons: Person[];
  isReady: boolean;
  credits: number;
  powerups: string[];
  stats: PlayerStats;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  ownerId: string;
  sourceId?: string;
}

export type GameStatus = "waiting" | "shipyard" | "playing" | "finished";
export type GamePhase = "programming" | "executing";
export type Difficulty = "easy" | "normal" | "hard";

export interface GameState {
  players: Record<string, Player>;
  status: GameStatus;
  mode: "single" | "multiplayer";
  difficulty: Difficulty;
  winner?: number;
  turnTime: number;
  phase: GamePhase;
  currentTurn: number;
  maxTurns: number;
  forfeitedBy?: number;
}

export interface GameEvent {
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

export interface MatchHistoryEntry {
  id: string;
  date: number;
  difficulty: Difficulty;
  result: "victory" | "defeat" | "draw";
  turns: number;
  playerStats: PlayerStats;
  aiStats: PlayerStats;
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalShipsDestroyed: number;
  totalShipsLost: number;
}

export interface PowerupData {
  id: string;
  name: string;
  cost: number;
  effect: "defense" | "moveDistance" | "damage";
  value: number;
  description: string;
}
