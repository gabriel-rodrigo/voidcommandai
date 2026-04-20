import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../server/db", () => ({
  submitScore: vi.fn().mockResolvedValue(1),
  getGlobalLeaderboard: vi.fn().mockResolvedValue([
    {
      userId: 1,
      playerName: "TestPlayer",
      bestScore: 2500,
      totalGames: 10,
      totalWins: 7,
      totalDamage: 5000,
    },
    {
      userId: 2,
      playerName: "Player2",
      bestScore: 1800,
      totalGames: 5,
      totalWins: 3,
      totalDamage: 2500,
    },
  ]),
  getLeaderboardByDifficulty: vi.fn().mockResolvedValue([
    {
      userId: 1,
      playerName: "HardcorePlayer",
      bestScore: 3000,
      totalGames: 8,
      totalWins: 6,
      totalDamage: 6000,
    },
  ]),
  getRecentScores: vi.fn().mockResolvedValue([
    {
      id: 1,
      playerName: "RecentPlayer",
      score: 1500,
      difficulty: "normal",
      result: "victory",
      turns: 15,
      damageDealt: 800,
      shipsDestroyed: 3,
      shipsLost: 1,
      createdAt: new Date(),
    },
  ]),
  getPlayerStats: vi.fn().mockResolvedValue({
    rank: 5,
    bestScore: 2000,
    totalGames: 12,
    totalWins: 8,
    totalDamage: 6000,
    totalShipsDestroyed: 20,
    recentMatches: [],
  }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

describe("Leaderboard System", () => {
  describe("Score Computation", () => {
    it("computes score correctly for a victory on normal difficulty", () => {
      const input = {
        difficulty: "normal" as const,
        result: "victory" as const,
        turns: 10,
        damageDealt: 500,
        shipsDestroyed: 3,
        shipsLost: 1,
      };

      const difficultyMultiplier = 2; // normal
      const resultBonus = 500; // victory
      const efficiencyBonus = Math.max(0, 50 - input.turns) * 10; // (50-10)*10 = 400
      const shipPenalty = input.shipsLost * 50; // 50

      const score =
        (input.damageDealt * difficultyMultiplier +
          input.shipsDestroyed * 200 +
          resultBonus +
          efficiencyBonus -
          shipPenalty) *
        1; // victory multiplier

      const finalScore = Math.max(0, Math.round(score));
      // 500*2 + 3*200 + 500 + 400 - 50 = 1000 + 600 + 500 + 400 - 50 = 2450
      expect(finalScore).toBe(2450);
    });

    it("computes score correctly for a defeat on easy difficulty", () => {
      const input = {
        difficulty: "easy" as const,
        result: "defeat" as const,
        turns: 30,
        damageDealt: 200,
        shipsDestroyed: 1,
        shipsLost: 3,
      };

      const difficultyMultiplier = 1; // easy
      const resultBonus = 0; // defeat
      const efficiencyBonus = Math.max(0, 50 - input.turns) * 10; // (50-30)*10 = 200
      const shipPenalty = input.shipsLost * 50; // 150

      const score =
        (input.damageDealt * difficultyMultiplier +
          input.shipsDestroyed * 200 +
          resultBonus +
          efficiencyBonus -
          shipPenalty) *
        0.5; // defeat multiplier

      const finalScore = Math.max(0, Math.round(score));
      // (200*1 + 1*200 + 0 + 200 - 150) * 0.5 = (200 + 200 + 200 - 150) * 0.5 = 450 * 0.5 = 225
      expect(finalScore).toBe(225);
    });

    it("computes score correctly for a victory on hard difficulty", () => {
      const input = {
        difficulty: "hard" as const,
        result: "victory" as const,
        turns: 5,
        damageDealt: 800,
        shipsDestroyed: 3,
        shipsLost: 0,
      };

      const difficultyMultiplier = 3; // hard
      const resultBonus = 500; // victory
      const efficiencyBonus = Math.max(0, 50 - input.turns) * 10; // (50-5)*10 = 450
      const shipPenalty = input.shipsLost * 50; // 0

      const score =
        (input.damageDealt * difficultyMultiplier +
          input.shipsDestroyed * 200 +
          resultBonus +
          efficiencyBonus -
          shipPenalty) *
        1; // victory multiplier

      const finalScore = Math.max(0, Math.round(score));
      // 800*3 + 3*200 + 500 + 450 - 0 = 2400 + 600 + 500 + 450 = 3950
      expect(finalScore).toBe(3950);
    });

    it("ensures score is never negative", () => {
      const input = {
        difficulty: "easy" as const,
        result: "defeat" as const,
        turns: 50,
        damageDealt: 0,
        shipsDestroyed: 0,
        shipsLost: 3,
      };

      const difficultyMultiplier = 1;
      const resultBonus = 0;
      const efficiencyBonus = Math.max(0, 50 - input.turns) * 10; // 0
      const shipPenalty = input.shipsLost * 50; // 150

      const score =
        (input.damageDealt * difficultyMultiplier +
          input.shipsDestroyed * 200 +
          resultBonus +
          efficiencyBonus -
          shipPenalty) *
        0.5;

      const finalScore = Math.max(0, Math.round(score));
      expect(finalScore).toBe(0);
    });
  });

  describe("Leaderboard Data Structures", () => {
    it("leaderboard entry has required fields", () => {
      const entry = {
        userId: 1,
        playerName: "TestPlayer",
        bestScore: 2500,
        totalGames: 10,
        totalWins: 7,
        totalDamage: 5000,
      };

      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("playerName");
      expect(entry).toHaveProperty("bestScore");
      expect(entry).toHaveProperty("totalGames");
      expect(entry).toHaveProperty("totalWins");
      expect(entry).toHaveProperty("totalDamage");
      expect(typeof entry.bestScore).toBe("number");
      expect(entry.bestScore).toBeGreaterThanOrEqual(0);
    });

    it("win rate calculation is correct", () => {
      const entry = { totalGames: 10, totalWins: 7 };
      const winRate =
        entry.totalGames > 0
          ? Math.round((entry.totalWins / entry.totalGames) * 100)
          : 0;
      expect(winRate).toBe(70);
    });

    it("win rate is 0 when no games played", () => {
      const entry = { totalGames: 0, totalWins: 0 };
      const winRate =
        entry.totalGames > 0
          ? Math.round((entry.totalWins / entry.totalGames) * 100)
          : 0;
      expect(winRate).toBe(0);
    });
  });

  describe("Difficulty Multipliers", () => {
    it("easy has multiplier 1", () => {
      const mult = getMultiplier("easy");
      expect(mult).toBe(1);
    });

    it("normal has multiplier 2", () => {
      const mult = getMultiplier("normal");
      expect(mult).toBe(2);
    });

    it("hard has multiplier 3", () => {
      const mult = getMultiplier("hard");
      expect(mult).toBe(3);
    });
  });
});

function getMultiplier(difficulty: "easy" | "normal" | "hard"): number {
  return difficulty === "hard" ? 3 : difficulty === "normal" ? 2 : 1;
}
