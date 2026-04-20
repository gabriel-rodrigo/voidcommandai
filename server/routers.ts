import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  leaderboard: router({
    /**
     * Submit a score after a match. Requires authentication.
     * The score is computed server-side from match data to prevent cheating.
     */
    submitScore: protectedProcedure
      .input(
        z.object({
          playerName: z.string().min(1).max(32).trim(),
          difficulty: z.enum(["easy", "normal", "hard"]),
          result: z.enum(["victory", "defeat", "draw"]),
          turns: z.number().int().min(1).max(999),
          damageDealt: z.number().int().min(0),
          shipsDestroyed: z.number().int().min(0),
          shipsLost: z.number().int().min(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Compute score server-side to prevent manipulation
        const difficultyMultiplier =
          input.difficulty === "hard" ? 3 : input.difficulty === "normal" ? 2 : 1;
        const resultBonus =
          input.result === "victory" ? 500 : input.result === "draw" ? 100 : 0;
        const efficiencyBonus = Math.max(0, 50 - input.turns) * 10;
        const shipPenalty = input.shipsLost * 50;

        const score =
          (input.damageDealt * difficultyMultiplier +
            input.shipsDestroyed * 200 +
            resultBonus +
            efficiencyBonus -
            shipPenalty) *
          (input.result === "victory" ? 1 : 0.5);

        const finalScore = Math.max(0, Math.round(score));

        const id = await db.submitScore({
          userId: ctx.user.id,
          playerName: input.playerName,
          score: finalScore,
          difficulty: input.difficulty,
          result: input.result,
          turns: input.turns,
          damageDealt: input.damageDealt,
          shipsDestroyed: input.shipsDestroyed,
          shipsLost: input.shipsLost,
        });

        return { id, score: finalScore };
      }),

    /**
     * Get the global leaderboard (top players by best score).
     * Public — anyone can view rankings.
     */
    global: publicProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(100).optional().default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const limit = input?.limit ?? 50;
        return db.getGlobalLeaderboard(limit);
      }),

    /**
     * Get leaderboard filtered by difficulty.
     */
    byDifficulty: publicProcedure
      .input(
        z.object({
          difficulty: z.enum(["easy", "normal", "hard"]),
          limit: z.number().int().min(1).max(100).optional().default(50),
        })
      )
      .query(async ({ input }) => {
        return db.getLeaderboardByDifficulty(input.difficulty, input.limit);
      }),

    /**
     * Get recent high scores (individual matches).
     */
    recent: publicProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(100).optional().default(30),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const limit = input?.limit ?? 30;
        return db.getRecentScores(limit);
      }),

    /**
     * Get the authenticated player's stats and rank.
     */
    myStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getPlayerStats(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
