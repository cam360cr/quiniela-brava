import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(72),
});

export const loginSchema = z.object({
  identifier: z.string().min(3), // email o username
  password: z.string().min(6).max(72),
});

export const createLeagueSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(255).optional(),
  isPublic: z.boolean().optional().default(false),
  pointsExact: z.number().int().min(0).max(20).optional(),
  pointsOutcome: z.number().int().min(0).max(20).optional(),
});

export const joinLeagueSchema = z.object({
  joinCode: z.string().min(4).max(12),
});

export const createMatchSchema = z.object({
  homeTeam: z.string().min(2).max(64),
  awayTeam: z.string().min(2).max(64),
  kickoffAt: z.string().datetime(),
  lockAt: z.string().datetime().optional(),
});

export const predictionSchema = z.object({
  matchId: z.string(),
  predHome: z.number().int().min(0).max(99),
  predAway: z.number().int().min(0).max(99),
});

export const setResultSchema = z.object({
  finalHome: z.number().int().min(0).max(99),
  finalAway: z.number().int().min(0).max(99),
});
