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

export const syncFixturesSchema = z.object({
  season: z.number().int().min(2020).max(2100).optional(),
  externalLeagueId: z.number().int().min(1).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const finalPickSchema = z.object({
  fullName: z.string().min(5).max(120),
  nationalId: z.string().min(5).max(32),
  phone: z.string().min(7).max(24),
  season: z.number().int().min(2020).max(2100).optional(),
  finalist1TeamId: z.string().min(5),
  finalist2TeamId: z.string().min(5),
  championTeamId: z.string().min(5),
});

export const adminTeamSchema = z.object({
  name: z.string().min(2).max(64),
  code: z.string().min(2).max(8).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});
