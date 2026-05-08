import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authRoutes } from './auth.js';
import { leagueRoutes } from './leagues.js';
import { finalPickRoutes } from './finalPicks.js';
import { syncLeagueFixturesFromApiFootball } from './sync.js';

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 7432);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    requireSuperadmin: any;
  }
}

app.register(cors, {
  origin: (origin, cb) => {
    // allow same-origin and local dev
    cb(null, true);
  },
  credentials: true,
});

app.register(jwt, { secret: JWT_SECRET });

app.decorate('authenticate', async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
});

app.decorate('requireSuperadmin', async (req: any, reply: any) => {
  const role = (req.user as any)?.role;
  if (role !== 'SUPERADMIN') return reply.code(403).send({ error: 'Forbidden' });
});

app.get('/health', async () => ({ ok: true }));

await authRoutes(app);
await leagueRoutes(app);
await finalPickRoutes(app);

const autoSyncEnabled = process.env.FIXTURES_AUTO_SYNC === 'true';
const autoSyncLeagueIds = (process.env.FIXTURES_AUTO_SYNC_LEAGUE_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const autoSyncMinutes = Number(process.env.FIXTURES_AUTO_SYNC_INTERVAL_MIN || 15);
const autoSyncSeason = Number(process.env.FIXTURES_SYNC_SEASON || 2026);
const autoSyncExternalLeagueId = Number(process.env.FIXTURES_SYNC_EXTERNAL_LEAGUE_ID || 1);

if (autoSyncEnabled && autoSyncLeagueIds.length > 0) {
  const runAutoSync = async () => {
    for (const leagueId of autoSyncLeagueIds) {
      try {
        const result = await syncLeagueFixturesFromApiFootball({
          leagueId,
          season: autoSyncSeason,
          externalLeagueId: autoSyncExternalLeagueId,
        });
        app.log.info({ leagueId, result }, 'auto fixture sync completed');
      } catch (error) {
        app.log.error({ err: error, leagueId }, 'auto fixture sync failed');
      }
    }
  };

  setInterval(runAutoSync, Math.max(1, autoSyncMinutes) * 60 * 1000);
  runAutoSync().catch((error) => app.log.error({ err: error }, 'initial auto sync failed'));
}

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`API running on http://localhost:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
