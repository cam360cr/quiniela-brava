import { prisma } from './prisma.js';
import { calcPoints } from './points.js';

type ApiFootballFixture = {
  fixture?: {
    date?: string;
    status?: { short?: string };
  };
  teams?: {
    home?: { name?: string; code?: string | null; logo?: string | null };
    away?: { name?: string; code?: string | null; logo?: string | null };
  };
  goals?: { home?: number | null; away?: number | null };
};

export type SyncFixturesOptions = {
  leagueId: string;
  season: number;
  externalLeagueId: number;
  from?: string;
  to?: string;
};

const FINISHED_STATUS = new Set(['FT', 'AET', 'PEN']);

function isFinished(short?: string) {
  return Boolean(short && FINISHED_STATUS.has(short));
}

async function findOrCreateTeamFromApi(leagueId: string, team: {
  name?: string;
  code?: string | null;
  logo?: string | null;
}) {
  const name = (team.name || '').trim();
  if (!name) throw new Error('Team name missing in provider payload');

  const code = team.code?.trim() || null;
  const logoUrl = team.logo?.trim() || null;

  if (code) {
    const byCode = await prisma.team.findFirst({ where: { leagueId, code } });
    if (byCode) {
      if (byCode.name !== name || byCode.logoUrl !== logoUrl) {
        return prisma.team.update({
          where: { id: byCode.id },
          data: { name, logoUrl },
        });
      }
      return byCode;
    }
  }

  const byName = await prisma.team.findFirst({ where: { leagueId, name } });
  if (byName) {
    if ((!byName.code && code) || byName.logoUrl !== logoUrl) {
      return prisma.team.update({
        where: { id: byName.id },
        data: { code: byName.code ?? code, logoUrl },
      });
    }
    return byName;
  }

  return prisma.team.create({
    data: { leagueId, name, code, logoUrl },
  });
}

async function recalcPointsForMatch(leagueId: string, matchId: string, finalHome: number, finalAway: number) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return 0;

  const preds = await prisma.prediction.findMany({ where: { leagueId, matchId } });
  if (!preds.length) return 0;

  const updates = preds.map((p) =>
    prisma.prediction.update({
      where: { id: p.id },
      data: {
        points: calcPoints(
          p.predHome,
          p.predAway,
          finalHome,
          finalAway,
          league.pointsExact,
          league.pointsOutcome
        ),
      },
    })
  );

  await prisma.$transaction(updates);
  return preds.length;
}

async function fetchApiFootballFixtures(options: {
  season: number;
  externalLeagueId: number;
  from?: string;
  to?: string;
}) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY is missing');
  }

  const url = new URL('https://v3.football.api-sports.io/fixtures');
  url.searchParams.set('league', String(options.externalLeagueId));
  url.searchParams.set('season', String(options.season));
  if (options.from) url.searchParams.set('from', options.from);
  if (options.to) url.searchParams.set('to', options.to);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-FOOTBALL request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { response?: ApiFootballFixture[] };
  return data.response ?? [];
}

export async function syncLeagueFixturesFromApiFootball(options: SyncFixturesOptions) {
  const fixtures = await fetchApiFootballFixtures({
    season: options.season,
    externalLeagueId: options.externalLeagueId,
    from: options.from,
    to: options.to,
  });

  let created = 0;
  let updated = 0;
  let resultsUpdated = 0;
  let predictionsRecalculated = 0;
  let skipped = 0;

  for (const fixture of fixtures) {
    const kickoffRaw = fixture.fixture?.date;
    const homeApi = fixture.teams?.home;
    const awayApi = fixture.teams?.away;

    if (!kickoffRaw || !homeApi?.name || !awayApi?.name) {
      skipped += 1;
      continue;
    }

    const kickoffAt = new Date(kickoffRaw);
    if (Number.isNaN(kickoffAt.getTime())) {
      skipped += 1;
      continue;
    }

    const [homeTeam, awayTeam] = await Promise.all([
      findOrCreateTeamFromApi(options.leagueId, homeApi),
      findOrCreateTeamFromApi(options.leagueId, awayApi),
    ]);

    const existing = await prisma.match.findFirst({
      where: {
        leagueId: options.leagueId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffAt,
      },
    });

    const statusShort = fixture.fixture?.status?.short;
    const finished = isFinished(statusShort);
    const finalHome = fixture.goals?.home ?? null;
    const finalAway = fixture.goals?.away ?? null;

    if (!existing) {
      const createdMatch = await prisma.match.create({
        data: {
          leagueId: options.leagueId,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt,
          lockAt: kickoffAt,
          finalHome: finished ? finalHome : null,
          finalAway: finished ? finalAway : null,
        },
      });
      created += 1;

      if (finished && finalHome !== null && finalAway !== null) {
        const recalculated = await recalcPointsForMatch(options.leagueId, createdMatch.id, finalHome, finalAway);
        if (recalculated > 0) {
          resultsUpdated += 1;
          predictionsRecalculated += recalculated;
        }
      }

      continue;
    }

    const shouldUpdateScore =
      finished &&
      finalHome !== null &&
      finalAway !== null &&
      (existing.finalHome !== finalHome || existing.finalAway !== finalAway);

    if (shouldUpdateScore) {
      await prisma.match.update({
        where: { id: existing.id },
        data: { finalHome, finalAway },
      });
      updated += 1;
      resultsUpdated += 1;

      predictionsRecalculated += await recalcPointsForMatch(options.leagueId, existing.id, finalHome, finalAway);
    }
  }

  return {
    provider: 'api-football',
    season: options.season,
    externalLeagueId: options.externalLeagueId,
    received: fixtures.length,
    created,
    updated,
    resultsUpdated,
    predictionsRecalculated,
    skipped,
  };
}
