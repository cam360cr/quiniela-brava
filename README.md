# Quiniela (API + Web) — Node + TypeScript + Prisma + Postgres

Este proyecto es una base **multi-quiniela** (ligas) con:
- Registro/Login (JWT)
- Crear liga y unirse por código
- Calendario de partidos (por torneo)
- Pronósticos por liga
- Carga de resultados (solo SUPERADMIN)
- Cálculo de puntos y ranking por liga

## Requisitos
- Node.js 18+ (recomendado 20)
- Docker (para Postgres) — (vos ya lo tenés)
- npm 9+

## 1) Levantar Postgres (ejemplo)
Si ya tenés Postgres con Docker, podés saltarte esto.
Si querés usar el ejemplo:

```bash
docker compose up -d
```

## 2) Variables de entorno

### API
Copiá el archivo de ejemplo y ajustá `DATABASE_URL` a tu Postgres local:

```bash
cp apps/api/.env.example apps/api/.env
```

### WEB
Copiá el ejemplo y apuntá al API:

```bash
cp apps/web/.env.example apps/web/.env.local
```

## 3) Instalar dependencias
En la raíz del proyecto:

```bash
npm install
```

## 4) Crear DB + migraciones
```bash
npm run prisma:migrate
npm run prisma:generate
```

## 5) Sembrar datos de ejemplo (torneo, equipos, partidos y un SUPERADMIN)
```bash
npm run db:seed
```

Esto crea:
- SUPERADMIN:
  - email: admin@demo.com
  - password: admin123
- Un torneo demo con equipos y partidos.

## 6) Correr en desarrollo
En dos terminales o usando el script combinado:

API:
```bash
npm run dev:api
```

WEB:
```bash
npm run dev:web
```

O ambos:
```bash
npm run dev
```

- API: http://localhost:7432
- WEB: http://localhost:8371

## Notas rápidas
- Para cargar resultados: logueate con `admin@demo.com` y usá la pantalla "Admin" en la web.
- El cierre de pronóstico se respeta con `lockAt`. Si la hora pasó, no deja guardar.

## Sync automatico de partidos (API externa)

Se puede sincronizar fixtures/resultados desde API-FOOTBALL.

Variables de entorno en `apps/api/.env`:

```bash
API_FOOTBALL_KEY=tu_api_key

# Auto sync opcional
FIXTURES_AUTO_SYNC=true
FIXTURES_AUTO_SYNC_LEAGUE_IDS=league_id_1,league_id_2
FIXTURES_AUTO_SYNC_INTERVAL_MIN=15
FIXTURES_SYNC_SEASON=2026
FIXTURES_SYNC_EXTERNAL_LEAGUE_ID=1
```

Sync manual por endpoint (OWNER o SUPERADMIN):

```bash
POST /leagues/:id/sync/fixtures
Authorization: Bearer <token>
Content-Type: application/json

{
  "season": 2026,
  "externalLeagueId": 1,
  "from": "2026-06-11",
  "to": "2026-07-19"
}
```

`season`, `externalLeagueId`, `from` y `to` son opcionales.

---
Si querés, luego se puede:
- Agregar ligas públicas y buscador
- Notificaciones
- Importar partidos desde API externa
- Roles por liga (OWNER/ADMIN) con gestión desde el front
