import { eq, desc, sql, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, scores, InsertScore } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Leaderboard Queries ────────────────────────────────────────────────────

/**
 * Submit a new score entry to the leaderboard.
 */
export async function submitScore(data: InsertScore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scores).values(data);
  return Number((result as any)[0]?.insertId ?? (result as any).insertId ?? 0);
}

/**
 * Get the global leaderboard: top players ranked by their best single-match score.
 * Returns up to `limit` entries.
 */
export async function getGlobalLeaderboard(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      userId: scores.userId,
      playerName: scores.playerName,
      bestScore: sql<number>`MAX(${scores.score})`.as("bestScore"),
      totalGames: sql<number>`COUNT(*)`.as("totalGames"),
      totalWins: sql<number>`SUM(CASE WHEN ${scores.result} = 'victory' THEN 1 ELSE 0 END)`.as("totalWins"),
      totalDamage: sql<number>`SUM(${scores.damageDealt})`.as("totalDamage"),
    })
    .from(scores)
    .groupBy(scores.userId, scores.playerName)
    .orderBy(sql`bestScore DESC`)
    .limit(limit);

  return rows;
}

/**
 * Get leaderboard filtered by difficulty.
 */
export async function getLeaderboardByDifficulty(
  difficulty: "easy" | "normal" | "hard",
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      userId: scores.userId,
      playerName: scores.playerName,
      bestScore: sql<number>`MAX(${scores.score})`.as("bestScore"),
      totalGames: sql<number>`COUNT(*)`.as("totalGames"),
      totalWins: sql<number>`SUM(CASE WHEN ${scores.result} = 'victory' THEN 1 ELSE 0 END)`.as("totalWins"),
      totalDamage: sql<number>`SUM(${scores.damageDealt})`.as("totalDamage"),
    })
    .from(scores)
    .where(eq(scores.difficulty, difficulty))
    .groupBy(scores.userId, scores.playerName)
    .orderBy(sql`bestScore DESC`)
    .limit(limit);

  return rows;
}

/**
 * Get recent high scores (individual match scores, most recent first).
 */
export async function getRecentScores(limit = 30) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: scores.id,
      playerName: scores.playerName,
      score: scores.score,
      difficulty: scores.difficulty,
      result: scores.result,
      turns: scores.turns,
      damageDealt: scores.damageDealt,
      shipsDestroyed: scores.shipsDestroyed,
      shipsLost: scores.shipsLost,
      createdAt: scores.createdAt,
    })
    .from(scores)
    .orderBy(desc(scores.createdAt))
    .limit(limit);
}

/**
 * Get a specific player's scores and rank.
 */
export async function getPlayerStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get player's best score
  const playerScores = await db
    .select({
      bestScore: sql<number>`MAX(${scores.score})`.as("bestScore"),
      totalGames: sql<number>`COUNT(*)`.as("totalGames"),
      totalWins: sql<number>`SUM(CASE WHEN ${scores.result} = 'victory' THEN 1 ELSE 0 END)`.as("totalWins"),
      totalDamage: sql<number>`SUM(${scores.damageDealt})`.as("totalDamage"),
      totalShipsDestroyed: sql<number>`SUM(${scores.shipsDestroyed})`.as("totalShipsDestroyed"),
    })
    .from(scores)
    .where(eq(scores.userId, userId));

  if (!playerScores.length || playerScores[0].totalGames === 0) return null;

  const stats = playerScores[0];

  // Compute rank: count distinct players with a higher best score
  const rankResult = await db
    .select({
      rank: sql<number>`COUNT(DISTINCT ${scores.userId}) + 1`.as("rank"),
    })
    .from(scores)
    .where(sql`${scores.userId} != ${userId}`)
    .having(sql`MAX(${scores.score}) > ${stats.bestScore}`);

  const rank = rankResult.length > 0 ? Number(rankResult[0].rank) : 1;

  // Get recent matches
  const recentMatches = await db
    .select({
      id: scores.id,
      score: scores.score,
      difficulty: scores.difficulty,
      result: scores.result,
      turns: scores.turns,
      damageDealt: scores.damageDealt,
      createdAt: scores.createdAt,
    })
    .from(scores)
    .where(eq(scores.userId, userId))
    .orderBy(desc(scores.createdAt))
    .limit(10);

  return {
    rank,
    bestScore: stats.bestScore,
    totalGames: stats.totalGames,
    totalWins: stats.totalWins,
    totalDamage: stats.totalDamage,
    totalShipsDestroyed: stats.totalShipsDestroyed,
    recentMatches,
  };
}
