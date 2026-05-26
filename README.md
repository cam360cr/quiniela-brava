# Quiniela (API + Web) — Node + TypeScript + Prisma + Postgres

Este proyecto es una base **multi-quiniela** enfocada en Mundial 2026, con:
- Registro/Login (JWT)
- Registro reforzado: cedula unica, nombre completo, fecha de nacimiento, foto de factura y confirmacion de Instagram
- Calendario Mundial 2026 publico
- Quinielas privadas para usuarios registrados
- Crear quiniela (solo SUPERADMIN) y unirse por codigo
- Pronosticos por liga
- Carga de resultados (solo OWNER de quiniela)
- Calculo de puntos y ranking por liga
- Pagina de premios del ranking final

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
  - password: Admin123!
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

## 7) Correr con Docker (VPS)

Esta opcion levanta **Postgres + API + Web** con un solo comando.

### Variables importantes
- `JWT_SECRET`: cambia este valor en produccion.

En Linux/macOS:
```bash
export JWT_SECRET="pon_un_secreto_largo_y_random"
```

En PowerShell:
```powershell
$env:JWT_SECRET="pon_un_secreto_largo_y_random"
```

### Levantar servicios
```bash
docker compose up -d --build
```

### Ver logs
```bash
docker compose logs -f api web postgres
```

### URLs por defecto
- Web: http://TU_IP_O_DOMINIO:8371
- API health: http://TU_IP_O_DOMINIO:7432/health

Notas:
- El contenedor `api` ejecuta `prisma migrate deploy` al iniciar, para aplicar migraciones pendientes.
- Si actualizas codigo, vuelve a construir con `docker compose up -d --build`.

## 8) Si ves errores de DB en Partidos/Admin

Si el error menciona una columna faltante (por ejemplo `groupName`), significa que faltan migraciones en la base de datos.

En local puedes ejecutarlo asi:
```bash
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

## Notas rápidas
- Para cargar resultados: logueate con `admin@demo.com` y usa la pantalla "Admin" en la web.
- El cierre de pronóstico se respeta con `lockAt`. Si la hora pasó, no deja guardar.
- En Admin, cada quiniela tiene su propio catalogo de equipos.
- Al crear un equipo en quiniela, la foto es obligatoria (URL o subida de archivo desde el navegador).
- Las fotos ya usadas pueden reutilizarse desde la biblioteca de imagenes dentro de Admin.
- La seccion Finalistas fue retirada del flujo principal.
- Premios: de momento el primer lugar del ranking final gana USD $1000.

---
Si querés, luego se puede:
- Agregar ligas públicas y buscador
- Notificaciones
- Roles por liga (OWNER/ADMIN) con gestión desde el front
