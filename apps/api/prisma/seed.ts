import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildDefaultMatchTemplates, DEFAULT_TEAMS } from '../src/utils.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@demo.com';
  const password = 'Admin123!';
  const username = 'superadmin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role: Role.SUPERADMIN,
      },
    });
  }

  for (const team of DEFAULT_TEAMS) {
    await prisma.team.upsert({
      where: { code: team.code },
      update: { name: team.name },
      create: team,
    });
  }

  const crc = await prisma.team.findUnique({ where: { code: 'CRC' } });
  const arg = await prisma.team.findUnique({ where: { code: 'ARG' } });
  const esp = await prisma.team.findUnique({ where: { code: 'ESP' } });
  const bra = await prisma.team.findUnique({ where: { code: 'BRA' } });

  if (!crc || !arg || !esp || !bra) throw new Error('Teams not created');

  const adminUser = await prisma.user.findUnique({ where: { email } });
  if (adminUser) {
    const league = await prisma.league.upsert({
      where: { id: 'demo_league' },
      update: {
        name: 'Quiniela Demo',
        description: 'Quiniela base para probar el flujo completo.',
      },
      create: {
        id: 'demo_league',
        name: 'Quiniela Demo',
        description: 'Quiniela base para probar el flujo completo.',
        joinCode: 'DEMO12',
        createdById: adminUser.id,
        pointsExact: 3,
        pointsOutcome: 1,
        isPublic: false,
      },
    });

    await prisma.leagueMember.upsert({
      where: { leagueId_userId: { leagueId: league.id, userId: adminUser.id } },
      update: { role: 'OWNER' },
      create: { leagueId: league.id, userId: adminUser.id, role: 'OWNER' },
    });

    const matches = buildDefaultMatchTemplates();
    const teamByCode = {
      CRC: crc,
      ARG: arg,
      ESP: esp,
      BRA: bra,
    } as const;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const homeTeam = teamByCode[match.homeCode as keyof typeof teamByCode];
      const awayTeam = teamByCode[match.awayCode as keyof typeof teamByCode];

      await prisma.match.upsert({
        where: { id: `demo_league_match_${i + 1}` },
        update: {
          leagueId: league.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt: match.kickoffAt,
          lockAt: match.lockAt,
        },
        create: {
          id: `demo_league_match_${i + 1}`,
          leagueId: league.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt: match.kickoffAt,
          lockAt: match.lockAt,
        },
      });
    }
  }

  console.log('Seed listo ✅');
  console.log('SUPERADMIN: admin@demo.com / Admin123!');
  console.log('Quiniela demo joinCode: DEMO12');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
