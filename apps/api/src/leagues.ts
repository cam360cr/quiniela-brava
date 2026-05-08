import type { FastifyInstance } from 'fastify';
import { prisma } from './prisma.js';
import { adminTeamSchema, createLeagueSchema, createMatchSchema, joinLeagueSchema, predictionSchema, setResultSchema, syncFixturesSchema } from './schemas.js';
import { makeJoinCode } from './utils.js';
import { calcPoints } from './points.js';
import { syncLeagueFixturesFromApiFootball } from './sync.js';

function isSuperadmin(req: any) {
  return (req.user as any)?.role === 'SUPERADMIN';
}

async function findOrCreateTeam(name: string) {
  const normalizedName = name.trim();
  const existing = await prisma.team.findFirst({ where: { name: normalizedName } });
  if (existing) return existing;

  return prisma.team.create({ data: { name: normalizedName } });
}

export async function leagueRoutes(app: FastifyInstance) {
  // Crear liga (cualquier usuario logueado)
  app.post('/leagues', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = createLeagueSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const uid = (req.user as any).uid as string;
    const { name, description, isPublic, pointsExact, pointsOutcome } = parsed.data;

    // joinCode único
    let code = makeJoinCode(6);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.league.findUnique({ where: { joinCode: code } });
      if (!exists) break;
      code = makeJoinCode(6);
    }

    const league = await prisma.league.create({
      data: {
        name,
        description,
        isPublic,
        joinCode: code,
        createdById: uid,
        pointsExact: pointsExact ?? 3,
        pointsOutcome: pointsOutcome ?? 1,
        members: {
          create: { userId: uid, role: 'OWNER' },
        },
      },
    });

    return reply.send({ league });
  });

  // Unirse por código
  app.post('/leagues/join', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = joinLeagueSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const uid = (req.user as any).uid as string;
    const { joinCode } = parsed.data;

    const league = await prisma.league.findUnique({ where: { joinCode } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    await prisma.leagueMember.upsert({
      where: { leagueId_userId: { leagueId: league.id, userId: uid } },
      update: {},
      create: { leagueId: league.id, userId: uid, role: 'MEMBER' },
    });

    return reply.send({ leagueId: league.id });
  });

  // Mis ligas
  app.get('/leagues/mine', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;

    const leagues = await prisma.league.findMany({
      where: { members: { some: { userId: uid } } },
      include: {
        _count: {
          select: { members: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ leagues });
  });

  // SUPERADMIN: ver todas las quinielas
  app.get('/admin/leagues', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (_req, reply) => {
    const leagues = await prisma.league.findMany({
      include: {
        createdBy: { select: { id: true, username: true, email: true } },
        _count: {
          select: { members: true, matches: true, predictions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ leagues });
  });

  // SUPERADMIN: ver todos los usuarios
  app.get('/admin/users', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (_req, reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            leagues: true,
            createdLeagues: true,
            predictions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ users });
  });

  app.get('/admin/teams', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const q = String((req.query as any)?.q || '').trim();
    const teams = await prisma.team.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ name: 'asc' }],
      take: 300,
    });

    return reply.send({ teams });
  });

  app.post('/admin/teams', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const parsed = adminTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl?.trim() || null;

    if (code) {
      const existingCode = await prisma.team.findUnique({ where: { code } });
      if (existingCode) return reply.code(409).send({ error: 'Code already in use' });
    }

    const team = await prisma.team.create({
      data: { name, code, logoUrl },
    });

    return reply.send({ team });
  });

  app.patch('/admin/teams/:id', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const parsed = adminTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const id = (req.params as any).id as string;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Team not found' });

    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl?.trim() || null;

    if (code) {
      const duplicate = await prisma.team.findUnique({ where: { code } });
      if (duplicate && duplicate.id !== id) {
        return reply.code(409).send({ error: 'Code already in use' });
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: { name, code, logoUrl },
    });

    return reply.send({ team });
  });

  // Detalle liga + miembros
  app.get('/leagues/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const id = (req.params as any).id as string;

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: id, userId: uid } },
    });
    if (!membership && !isSuperadmin(req)) return reply.code(403).send({ error: 'Not a member' });

    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, username: true } },
        members: { include: { user: { select: { id: true, username: true } } } },
        _count: { select: { matches: true, predictions: true } },
      },
    });

    return reply.send({ league });
  });

  // Calendario de la liga + mi predicción por partido
  app.get('/leagues/:id/matches', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const id = (req.params as any).id as string;

    const league = await prisma.league.findUnique({ where: { id } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: id, userId: uid } },
    });
    if (!membership && !isSuperadmin(req)) return reply.code(403).send({ error: 'Not a member' });

    const canManage = membership?.role === 'OWNER';

    const matches = await prisma.match.findMany({
      where: { leagueId: league.id },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: 'asc' },
    });

    const preds = await prisma.prediction.findMany({
      where: { leagueId: id, userId: uid },
      select: { matchId: true, predHome: true, predAway: true, points: true },
    });

    const predMap = new Map(preds.map(p => [p.matchId, p]));

    const items = matches.map(m => ({
      ...m,
      myPrediction: predMap.get(m.id) ?? null,
    }));

    return reply.send({ league, matches: items, canManage });
  });

  // OWNER: crear partido dentro de la quiniela
  app.post('/leagues/:id/matches', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;
    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });

    const canManage = membership?.role === 'OWNER';
    if (!canManage) return reply.code(403).send({ error: 'Forbidden' });

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const { homeTeam, awayTeam, kickoffAt, lockAt } = parsed.data;
    if (homeTeam.trim().toLowerCase() === awayTeam.trim().toLowerCase()) {
      return reply.code(400).send({ error: 'Los equipos deben ser distintos' });
    }

    const kickoffDate = new Date(kickoffAt);
    const lockDate = lockAt ? new Date(lockAt) : kickoffDate;
    if (Number.isNaN(kickoffDate.getTime()) || Number.isNaN(lockDate.getTime())) {
      return reply.code(400).send({ error: 'Fecha invalida' });
    }
    if (lockDate > kickoffDate) {
      return reply.code(400).send({ error: 'El cierre no puede ser despues del kickoff' });
    }

    const [home, away] = await Promise.all([
      findOrCreateTeam(homeTeam),
      findOrCreateTeam(awayTeam),
    ]);

    const match = await prisma.match.create({
      data: {
        leagueId,
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: kickoffDate,
        lockAt: lockDate,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return reply.send({ match });
  });

  // Guardar pronóstico (upsert)
  app.post('/leagues/:id/predictions', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = predictionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });
    if (!membership) return reply.code(403).send({ error: 'Not a member' });

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const { matchId, predHome, predAway } = parsed.data;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.leagueId !== league.id) {
      return reply.code(400).send({ error: 'Match not in league' });
    }

    if (new Date() >= match.lockAt) {
      return reply.code(400).send({ error: 'Predictions locked for this match' });
    }

    const points =
      match.finalHome !== null && match.finalAway !== null
        ? calcPoints(
            predHome,
            predAway,
            match.finalHome,
            match.finalAway,
            league.pointsExact,
            league.pointsOutcome
          )
        : null;

    const prediction = await prisma.prediction.upsert({
      where: { leagueId_userId_matchId: { leagueId, userId: uid, matchId } },
      update: { predHome, predAway, points },
      create: { leagueId, userId: uid, matchId, predHome, predAway, points },
    });

    return reply.send({ prediction });
  });

  // Leaderboard por liga (sum points)
  app.get('/leagues/:id/leaderboard', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });
    if (!membership && !isSuperadmin(req)) return reply.code(403).send({ error: 'Not a member' });

    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      include: { user: { select: { id: true, username: true } } },
    });

    const points = await prisma.prediction.groupBy({
      by: ['userId'],
      where: { leagueId, points: { not: null } },
      _sum: { points: true },
    });

    const map = new Map(points.map(p => [p.userId, p._sum.points ?? 0]));

    const leaderboard = members
      .map(m => ({ userId: m.user.id, username: m.user.username, totalPoints: map.get(m.user.id) ?? 0 }))
      .sort((a,b) => b.totalPoints - a.totalPoints || a.username.localeCompare(b.username));

    return reply.send({ leaderboard });
  });

  // OWNER: set match result + recalc points for all predictions for that match
  app.patch('/leagues/:leagueId/matches/:id/result', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).leagueId as string;
    const matchId = (req.params as any).id as string;
    const parsed = setResultSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });
    if (membership?.role !== 'OWNER') return reply.code(403).send({ error: 'Only league owner can set results' });

    const existingMatch = await prisma.match.findUnique({ where: { id: matchId } });
    if (!existingMatch || existingMatch.leagueId !== leagueId) {
      return reply.code(404).send({ error: 'Match not found in this league' });
    }

    const { finalHome, finalAway } = parsed.data;

    const match = await prisma.match.update({
      where: { id: matchId },
      data: { finalHome, finalAway },
    });

    // find all predictions for this match across all leagues
    const preds = await prisma.prediction.findMany({
      where: { matchId },
      include: { league: true },
    });

    const updates = preds.map(p => {
      const pts = calcPoints(
        p.predHome, p.predAway,
        finalHome, finalAway,
        p.league.pointsExact,
        p.league.pointsOutcome
      );
      return prisma.prediction.update({ where: { id: p.id }, data: { points: pts } });
    });

    await prisma.$transaction(updates);

    return reply.send({ match, updatedPredictions: preds.length });
  });

  // OWNER o SUPERADMIN: sincronizar partidos de una liga desde API externa
  app.post('/leagues/:id/sync/fixtures', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = syncFixturesSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });

    const canManage = membership?.role === 'OWNER' || isSuperadmin(req);
    if (!canManage) return reply.code(403).send({ error: 'Only league owner or superadmin can sync fixtures' });

    const season = parsed.data.season ?? 2026;
    const externalLeagueId = parsed.data.externalLeagueId ?? 1;

    try {
      const result = await syncLeagueFixturesFromApiFootball({
        leagueId,
        season,
        externalLeagueId,
        from: parsed.data.from,
        to: parsed.data.to,
      });

      return reply.send({ ok: true, leagueId, sync: result });
    } catch (error: any) {
      req.log.error({ err: error, leagueId }, 'fixtures sync failed');
      return reply.code(502).send({
        error: 'Sync failed',
        message: error?.message ?? 'Provider error',
      });
    }
  });
}
