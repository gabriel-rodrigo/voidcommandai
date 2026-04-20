import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
  },
}));

import {
  getSettings,
  saveSettings,
  getStats,
  saveStats,
  getCredits,
  saveCredits,
  getPowerups,
  savePowerups,
  getMatchHistory,
  addMatchToHistory,
} from "../storage";

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
});

describe("Storage Service", () => {
  describe("Settings", () => {
    it("returns default settings when none saved", async () => {
      const settings = await getSettings();
      expect(settings.musicVolume).toBe(0.5);
      expect(settings.sfxVolume).toBe(0.5);
      expect(settings.isMuted).toBe(false);
    });

    it("saves and retrieves settings", async () => {
      await saveSettings({ musicVolume: 0.8, sfxVolume: 0.3, isMuted: true });
      const settings = await getSettings();
      expect(settings.musicVolume).toBe(0.8);
      expect(settings.sfxVolume).toBe(0.3);
      expect(settings.isMuted).toBe(true);
    });
  });

  describe("Stats", () => {
    it("returns default stats when none saved", async () => {
      const stats = await getStats();
      expect(stats.totalGames).toBe(0);
      expect(stats.wins).toBe(0);
    });

    it("saves and retrieves stats", async () => {
      await saveStats({
        totalGames: 5,
        wins: 3,
        losses: 1,
        draws: 1,
        totalDamageDealt: 500,
        totalDamageTaken: 300,
        totalShipsDestroyed: 8,
        totalShipsLost: 4,
      });
      const stats = await getStats();
      expect(stats.totalGames).toBe(5);
      expect(stats.wins).toBe(3);
    });
  });

  describe("Credits", () => {
    it("returns default credits (150) when none saved", async () => {
      const credits = await getCredits();
      expect(credits).toBe(150);
    });

    it("saves and retrieves credits", async () => {
      await saveCredits(300);
      const credits = await getCredits();
      expect(credits).toBe(300);
    });
  });

  describe("Powerups", () => {
    it("returns empty array when none saved", async () => {
      const powerups = await getPowerups();
      expect(powerups).toEqual([]);
    });

    it("saves and retrieves powerups", async () => {
      await savePowerups(["shield_upgrade", "weapon_upgrade"]);
      const powerups = await getPowerups();
      expect(powerups).toEqual(["shield_upgrade", "weapon_upgrade"]);
    });
  });

  describe("Match History", () => {
    it("returns empty array when none saved", async () => {
      const history = await getMatchHistory();
      expect(history).toEqual([]);
    });

    it("adds match to history", async () => {
      const entry = {
        id: "test-1",
        date: Date.now(),
        difficulty: "normal" as const,
        result: "victory" as const,
        turns: 10,
        playerStats: {
          damageDealt: 100,
          damageTaken: 50,
          shotsFired: 20,
          shotsHit: 15,
          shipsLost: 1,
          shipsDestroyed: 3,
        },
        aiStats: {
          damageDealt: 50,
          damageTaken: 100,
          shotsFired: 18,
          shotsHit: 10,
          shipsLost: 3,
          shipsDestroyed: 1,
        },
      };
      await addMatchToHistory(entry);
      const history = await getMatchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].result).toBe("victory");
    });
  });
});
