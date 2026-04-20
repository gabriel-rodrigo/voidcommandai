import { ShipType, PowerupData } from "./types";

export const SCENE_WIDTH = 450;
export const SCENE_HEIGHT = 600;
export const TICK_RATE = 30;
export const TICK_INTERVAL = 1 / TICK_RATE;
export const MAX_TURNS = 50;
export const PROGRAMMING_TIME = 30;
export const EXECUTION_TIME = 3;
export const FLEET_SIZE = 3;
export const BULLET_SPEED = 125;
export const CRITICAL_CHANCE = 0.15;
export const CRITICAL_MULTIPLIER = 1.5;
export const KILL_CREDITS = 25;
export const WIN_CREDITS = 100;
export const LOSE_CREDITS = 30;

export const SHIP_TYPES: Record<string, ShipType> = {
  wall: {
    id: "wall",
    name: "Wall",
    life: 200,
    speed: 50,
    size: 30,
    defense: 20,
    moveDistance: 100,
    weaponName: "Heavy Plating",
    damage: 28,
    range: 260,
    description: "The Tank: absorbs heavy damage.",
  },
  needle: {
    id: "needle",
    name: "Needle",
    life: 60,
    speed: 170,
    size: 15,
    defense: 4,
    moveDistance: 300,
    weaponName: "Swift Laser",
    damage: 32,
    range: 300,
    description: "The fastest: hit and run tactics.",
  },
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    life: 120,
    speed: 110,
    size: 20,
    defense: 12,
    moveDistance: 200,
    weaponName: "Standard Railgun",
    damage: 24,
    range: 340,
    description: "The versatile: good for any situation.",
  },
  sentinel: {
    id: "sentinel",
    name: "Sentinel",
    life: 100,
    speed: 80,
    size: 22,
    defense: 8,
    moveDistance: 150,
    weaponName: "Long-Range Beam",
    damage: 36,
    range: 500,
    description: "Long range: attacks from afar unseen.",
  },
  stinger: {
    id: "stinger",
    name: "Stinger",
    life: 80,
    speed: 140,
    size: 18,
    defense: 6,
    moveDistance: 250,
    weaponName: "Fatal Sting",
    damage: 40,
    range: 220,
    description: "Glass cannon: fatal attack, but fragile.",
  },
};

export const SHIP_TYPES_LIST: ShipType[] = Object.values(SHIP_TYPES);

export const POWERUPS: Record<string, PowerupData> = {
  shield_upgrade: {
    id: "shield_upgrade",
    name: "Shield Upgrade",
    cost: 50,
    effect: "defense",
    value: 15,
    description: "+15 Defense for all your ships.",
  },
  engine_upgrade: {
    id: "engine_upgrade",
    name: "Engine Upgrade",
    cost: 50,
    effect: "moveDistance",
    value: 80,
    description: "+80 Move Distance for all your ships.",
  },
  weapon_upgrade: {
    id: "weapon_upgrade",
    name: "Weapon Upgrade",
    cost: 75,
    effect: "damage",
    value: 15,
    description: "+15 Damage for all your ships.",
  },
};

export const POWERUPS_LIST: PowerupData[] = Object.values(POWERUPS);

export const FLEET_OFFSETS = [
  { x: 0, y: 0 },
  { x: -60, y: 40 },
  { x: 60, y: 40 },
];
