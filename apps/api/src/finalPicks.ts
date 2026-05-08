import type { FastifyInstance } from 'fastify';
import { prisma } from './prisma.js';
import { adminTeamSchema, finalPickSchema } from './schemas.js';

const DEFAULT_SEASON = 2026;

export async function finalPickRoutes(app: FastifyInstance) {
  app.get('/final-picks/teams', { preHandler: [app.authenticate] }, async (req, reply) => {
    const q = String((req.query as any)?.q || '').trim();

    const teams = await prisma.finalistTeam.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: { id: true, name: true, code: true, logoUrl: true },
      orderBy: [{ name: 'asc' }],
      take: 250,
    });

    return reply.send({ teams });
  });

  app.get('/final-picks/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as any).uid as string;
    const season = Number((req.query as any)?.season || DEFAULT_SEASON);

    const [user, profile, pick] = await Promise.all([
      prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, email: true, username: true },
      }),
      prisma.userProfile.findUnique({ where: { userId: uid } }),
      prisma.finalPick.findUnique({
        where: { userId_season: { userId: uid, season } },
      }),
    ]);

    return reply.send({ user, profile, pick, season });
  });

  app.post('/final-picks/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = finalPickSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const uid = (req.user as any).uid as string;
    const data = parsed.data;
    const season = data.season ?? DEFAULT_SEASON;

    if (data.finalist1TeamId === data.finalist2TeamId) {
      return reply.code(400).send({ error: 'Los dos finalistas deben ser distintos' });
    }

    if (![data.finalist1TeamId, data.finalist2TeamId].includes(data.championTeamId)) {
      return reply.code(400).send({ error: 'El campeon debe ser uno de los finalistas elegidos' });
    }

    const selectedTeamIds = Array.from(new Set([data.finalist1TeamId, data.finalist2TeamId, data.championTeamId]));

    const teams = await prisma.finalistTeam.findMany({
      where: {
        id: { in: selectedTeamIds },
      },
      select: { id: true },
    });

    if (teams.length !== selectedTeamIds.length) {
      return reply.code(400).send({ error: 'Uno o mas equipos no existen' });
    }

    const [profile, pick] = await prisma.$transaction([
      prisma.userProfile.upsert({
        where: { userId: uid },
        update: {
          fullName: data.fullName.trim(),
          nationalId: data.nationalId.trim(),
          phone: data.phone.trim(),
        },
        create: {
          userId: uid,
          fullName: data.fullName.trim(),
          nationalId: data.nationalId.trim(),
          phone: data.phone.trim(),
        },
      }),
      prisma.finalPick.upsert({
        where: { userId_season: { userId: uid, season } },
        update: {
          finalist1TeamId: data.finalist1TeamId,
          finalist2TeamId: data.finalist2TeamId,
          championTeamId: data.championTeamId,
        },
        create: {
          userId: uid,
          season,
          finalist1TeamId: data.finalist1TeamId,
          finalist2TeamId: data.finalist2TeamId,
          championTeamId: data.championTeamId,
        },
      }),
    ]);

    return reply.send({ ok: true, season, profile, pick });
  });

  app.get('/admin/final-picks', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const season = Number((req.query as any)?.season || DEFAULT_SEASON);

    const picks = await prisma.finalPick.findMany({
      where: { season },
      include: {
        user: { select: { id: true, email: true, username: true } },
        finalist1Team: { select: { id: true, name: true, code: true } },
        finalist2Team: { select: { id: true, name: true, code: true } },
        championTeam: { select: { id: true, name: true, code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: picks.map((pick) => pick.userId) } },
      select: { userId: true, fullName: true, nationalId: true, phone: true },
    });

    const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));

    return reply.send({
      season,
      picks: picks.map((pick) => ({
        id: pick.id,
        season: pick.season,
        user: pick.user,
        profile: profileMap.get(pick.userId) ?? null,
        finalist1Team: pick.finalist1Team,
        finalist2Team: pick.finalist2Team,
        championTeam: pick.championTeam,
        updatedAt: pick.updatedAt,
      })),
    });
  });

  app.get('/admin/finalist-teams', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const q = String((req.query as any)?.q || '').trim();
    const teams = await prisma.finalistTeam.findMany({
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

  app.post('/admin/finalist-teams', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const parsed = adminTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl?.trim() || null;

    if (code) {
      const existingCode = await prisma.finalistTeam.findUnique({ where: { code } });
      if (existingCode) return reply.code(409).send({ error: 'Code already in use' });
    }

    const team = await prisma.finalistTeam.create({
      data: { name, code, logoUrl },
    });

    return reply.send({ team });
  });

  app.patch('/admin/finalist-teams/:id', { preHandler: [app.authenticate, app.requireSuperadmin] }, async (req, reply) => {
    const parsed = adminTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const id = (req.params as any).id as string;
    const existing = await prisma.finalistTeam.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Team not found' });

    const name = parsed.data.name.trim();
    const code = parsed.data.code?.trim() || null;
    const logoUrl = parsed.data.logoUrl?.trim() || null;

    if (code) {
      const duplicate = await prisma.finalistTeam.findUnique({ where: { code } });
      if (duplicate && duplicate.id !== id) {
        return reply.code(409).send({ error: 'Code already in use' });
      }
    }

    const team = await prisma.finalistTeam.update({
      where: { id },
      data: { name, code, logoUrl },
    });

    return reply.send({ team });
  });
}
