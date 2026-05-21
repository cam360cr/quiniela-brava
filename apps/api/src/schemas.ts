import { z } from 'zod';

const imageDataUrlSchema = z.string().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/);

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^@?[A-Za-z0-9._]+$/),
  fullName: z.string().min(5).max(120),
  nationalId: z.string().min(5).max(32).regex(/^[0-9A-Za-z\-\s]+$/),
  instagramUsername: z.string().min(2).max(40).regex(/^@?[A-Za-z0-9._]+$/),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purchaseProofImage: imageDataUrlSchema,
  followsInstagram: z.boolean().refine((value) => value, {
    message: 'Debes confirmar que sigues a Barra Brava en Instagram',
  }),
  password: z.string().min(6).max(72),
});

export const loginSchema = z.object({
  identifier: z.string().min(3), // email, username o cedula
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
const imageHttpUrlSchema = z.string().url().refine((url) => {
  const clean = url.split('#')[0].split('?')[0].toLowerCase();
  return /\.(png|jpg|jpeg|webp|gif|svg)$/.test(clean);
}, { message: 'logoUrl must be a direct image URL' });
const teamImageSchema = z.union([imageHttpUrlSchema, imageDataUrlSchema]);

export const adminLeagueTeamSchema = z.object({
  leagueId: z.string().min(3),
  name: z.string().min(2).max(64),
  code: z.string().min(2).max(8).optional().nullable(),
  logoUrl: teamImageSchema,
});
