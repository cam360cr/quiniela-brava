import type { FastifyInstance } from 'fastify';
import { prisma } from './prisma.js';
import { adminLeagueTeamSchema, createLeagueSchema, createMatchSchema, joinLeagueSchema, predictionSchema, setResultSchema, syncFixturesSchema } from './schemas.js';
import { makeJoinCode } from './utils.js';
import { calcPoints } from './points.js';
import { syncLeagueFixturesFromApiFootball } from './sync.js';

function isSuperadmin(req: any) {
  return (req.user as any)?.role === 'SUPERADMIN';
}

export async function leagueRoutes(app: FastifyInstance) {
  // Crear quiniela (solo superadmin)
  app.post('/leagues', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!isSuperadmin(req)) return reply.code(403).send({ error: 'Only superadmin can create leagues' });

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
    if (!isSuperadmin(req)) return reply.send({ leagues: [] });

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

  // Quinielas activas creadas por super admins
  app.get('/leagues/active', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;

    const leagues = await prisma.league.findMany({
      where: {
        createdBy: {
          role: 'SUPERADMIN',
        },
      },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
        members: {
          where: { userId: uid },
          select: { userId: true },
        },
        _count: {
          select: { members: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = leagues.map((league) => ({
      ...league,
      isMember: league.members.length > 0,
    }));

    return reply.send({ leagues: items });
  });

  // SUPERADMIN: ver todas las quinielas
  app.get('/admin/leagues', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (_req, reply) => {
    const leagues = await prisma.league.findMany({
      include: {
        createdBy: { select: { id: true, username: true, fullName: true, email: true } },
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
        fullName: true,
        nationalId: true,
        instagramUsername: true,
        birthDate: true,
        followsInstagram: true,
        purchaseProofImage: true,
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

    return reply.send({
      users: users.map((user) => ({
        ...user,
        hasPurchaseProof: Boolean(user.purchaseProofImage),
      })),
    });
  });

  // SUPERADMIN: ver detalle de un usuario
  app.get('/admin/users/:id', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const id = (req.params as any).id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        nationalId: true,
        instagramUsername: true,
        birthDate: true,
        followsInstagram: true,
        purchaseProofImage: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            leagues: true,
            createdLeagues: true,
            predictions: true,
          },
        },
        leagues: {
          orderBy: { joinedAt: 'desc' },
          select: {
            role: true,
            joinedAt: true,
            league: {
              select: {
                id: true,
                name: true,
                joinCode: true,
              },
            },
          },
        },
        createdLeagues: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            joinCode: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) return reply.code(404).send({ error: 'User not found' });

    return reply.send({
      user: {
        ...user,
        hasPurchaseProof: Boolean(user.purchaseProofImage),
      },
    });
  });

  app.get('/admin/teams', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const leagueId = String((req.query as any)?.leagueId || '').trim();
    const q = String((req.query as any)?.q || '').trim();

    if (!leagueId) {
      return reply.code(400).send({ error: 'leagueId is required' });
    }

    const teams = await prisma.team.findMany({
      where: q
        ? {
            leagueId,
            OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }],
          }
        : { leagueId },
      orderBy: [{ name: 'asc' }],
      take: 300,
    });

    return reply.send({ teams });
  });

  app.get('/admin/team-images', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (_req, reply) => {
    const leagueRows = await prisma.team.findMany({
      where: { logoUrl: { not: null } },
      select: { logoUrl: true },
      distinct: ['logoUrl'],
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const images = Array.from(new Set(leagueRows.map((row) => row.logoUrl).filter(Boolean))) as string[];

    return reply.send({ images: images.slice(0, 200) });
  });

  app.post('/admin/teams', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const parsed = adminLeagueTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const leagueId = parsed.data.leagueId.trim();
    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl.trim();

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    if (code) {
      const existingCode = await prisma.team.findFirst({ where: { leagueId, code } });
      if (existingCode) return reply.code(409).send({ error: 'Code already in use' });
    }

    const team = await prisma.team.create({
      data: { leagueId, name, code, logoUrl },
    });

    return reply.send({ team });
  });

  app.patch('/admin/teams/:id', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const parsed = adminLeagueTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const id = (req.params as any).id as string;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Team not found' });

    const leagueId = parsed.data.leagueId.trim();
    if (existing.leagueId !== leagueId) {
      return reply.code(400).send({ error: 'Team does not belong to this league' });
    }

    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl.trim();

    if (code) {
      const duplicate = await prisma.team.findFirst({ where: { leagueId, code } });
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

  app.delete('/admin/teams/:id', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const id = (req.params as any).id as string;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Team not found' });

    const matchesUsingTeam = await prisma.match.count({
      where: {
        OR: [{ homeTeamId: id }, { awayTeamId: id }],
      },
    });

    if (matchesUsingTeam > 0) {
      return reply.code(409).send({ error: 'No puedes eliminar este equipo porque ya esta usado en partidos' });
    }

    await prisma.team.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // Equipos por quiniela (miembros pueden ver, OWNER puede crear)
  app.get('/leagues/:id/teams', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;
    const q = String((req.query as any)?.q || '').trim();

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });
    if (!membership && !isSuperadmin(req)) return reply.code(403).send({ error: 'Not a member' });

    const canManage = membership?.role === 'OWNER' || isSuperadmin(req);

    const teams = await prisma.team.findMany({
      where: q
        ? {
            leagueId,
            OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }],
          }
        : { leagueId },
      orderBy: [{ name: 'asc' }],
      take: 300,
    });

    return reply.send({ teams, canManage });
  });

  app.get('/leagues/:id/team-images', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });
    if (!membership && !isSuperadmin(req)) return reply.code(403).send({ error: 'Not a member' });

    const rows = await prisma.team.findMany({
      where: { logoUrl: { not: null } },
      select: { logoUrl: true },
      distinct: ['logoUrl'],
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ images: rows.map((row) => row.logoUrl).filter(Boolean) });
  });

  app.post('/leagues/:id/teams', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).id as string;

    const parsed = adminLeagueTeamSchema.safeParse({
      ...(req.body as Record<string, unknown>),
      leagueId,
    });
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });

    const canManage = membership?.role === 'OWNER' || isSuperadmin(req);
    if (!canManage) return reply.code(403).send({ error: 'Forbidden' });

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return reply.code(404).send({ error: 'League not found' });

    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl.trim();

    if (code) {
      const duplicate = await prisma.team.findFirst({ where: { leagueId, code } });
      if (duplicate) return reply.code(409).send({ error: 'Code already in use' });
    }

    const team = await prisma.team.create({
      data: { leagueId, name, code, logoUrl },
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
        createdBy: { select: { id: true, username: true, fullName: true } },
        members: { include: { user: { select: { id: true, username: true, fullName: true } } } },
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

    const normalizedHome = homeTeam.trim();
    const normalizedAway = awayTeam.trim();

    const [home, away] = await Promise.all([
      prisma.team.findFirst({ where: { leagueId, name: normalizedHome } }),
      prisma.team.findFirst({ where: { leagueId, name: normalizedAway } }),
    ]);

    if (!home || !away) {
      return reply.code(400).send({
        error: 'Primero registra ambos equipos en la seccion Agregar equipos de esta quiniela',
      });
    }

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

  // OWNER o SUPERADMIN: editar partido
  app.patch('/leagues/:leagueId/matches/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).leagueId as string;
    const matchId = (req.params as any).id as string;

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });

    const canManage = membership?.role === 'OWNER' || isSuperadmin(req);
    if (!canManage) return reply.code(403).send({ error: 'Forbidden' });

    const existingMatch = await prisma.match.findUnique({ where: { id: matchId } });
    if (!existingMatch || existingMatch.leagueId !== leagueId) {
      return reply.code(404).send({ error: 'Match not found in this league' });
    }

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

    const normalizedHome = homeTeam.trim();
    const normalizedAway = awayTeam.trim();

    const [home, away] = await Promise.all([
      prisma.team.findFirst({ where: { leagueId, name: normalizedHome } }),
      prisma.team.findFirst({ where: { leagueId, name: normalizedAway } }),
    ]);

    if (!home || !away) {
      return reply.code(400).send({
        error: 'Primero registra ambos equipos en la seccion Agregar equipos de esta quiniela',
      });
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: kickoffDate,
        lockAt: lockDate,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return reply.send({ match });
  });

  // OWNER o SUPERADMIN: eliminar partido
  app.delete('/leagues/:leagueId/matches/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const leagueId = (req.params as any).leagueId as string;
    const matchId = (req.params as any).id as string;

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: uid } },
    });

    const canManage = membership?.role === 'OWNER' || isSuperadmin(req);
    if (!canManage) return reply.code(403).send({ error: 'Forbidden' });

    const existingMatch = await prisma.match.findUnique({ where: { id: matchId } });
    if (!existingMatch || existingMatch.leagueId !== leagueId) {
      return reply.code(404).send({ error: 'Match not found in this league' });
    }

    await prisma.$transaction([
      prisma.prediction.deleteMany({ where: { matchId } }),
      prisma.match.delete({ where: { id: matchId } }),
    ]);

    return reply.send({ ok: true });
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
      include: { user: { select: { id: true, username: true, fullName: true } } },
    });

    const points = await prisma.prediction.groupBy({
      by: ['userId'],
      where: { leagueId, points: { not: null } },
      _sum: { points: true },
    });

    const map = new Map(points.map(p => [p.userId, p._sum.points ?? 0]));

    const leaderboard = members
      .map((m) => {
        const displayName = m.user.fullName?.trim() || `@${m.user.username}`;
        return {
          userId: m.user.id,
          username: m.user.username,
          fullName: m.user.fullName,
          displayName,
          totalPoints: map.get(m.user.id) ?? 0,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName));

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
