import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leaderboard scores table.
 * Each row represents a single match result submitted by a player.
 * The ranking is computed from the aggregate score per player.
 */
export const scores = mysqlTable("scores", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to the user who played */
  userId: int("userId").notNull(),
  /** Display name chosen by the player (can differ from auth name) */
  playerName: varchar("playerName", { length: 64 }).notNull(),
  /** Computed score for this match: damage * multiplier - penalties */
  score: int("score").notNull(),
  /** Difficulty of the match */
  difficulty: mysqlEnum("difficulty", ["easy", "normal", "hard"]).notNull(),
  /** Match result */
  result: mysqlEnum("result", ["victory", "defeat", "draw"]).notNull(),
  /** Number of turns the match lasted */
  turns: int("turns").notNull(),
  /** Damage dealt by the player in this match */
  damageDealt: int("damageDealt").notNull(),
  /** Ships destroyed by the player */
  shipsDestroyed: int("shipsDestroyed").notNull(),
  /** Ships lost by the player */
  shipsLost: int("shipsLost").notNull(),
  /** When this score was submitted */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;
