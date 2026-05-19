import type { FastifyInstance, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { loginSchema, registerSchema } from './schemas.js';

function normalizeUsernamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
}

function normalizeNationalId(value: string) {
  const compact = value.trim().replace(/\s+/g, '');
  const digitsOnly = compact.replace(/\D/g, '');
  return digitsOnly.length >= 5 ? digitsOnly : compact.toUpperCase();
}

function normalizeInstagramUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

async function buildUniqueUsername(fullName: string, email: string, nationalId: string) {
  const fromName = normalizeUsernamePart(fullName);
  const fromEmail = normalizeUsernamePart(email.split('@')[0] ?? '');
  const base = fromName || fromEmail || 'usuario';
  const nationalSuffix = nationalId.replace(/\D/g, '').slice(-4);
  const preferred = `${base}${nationalSuffix}`.slice(0, 24) || 'usuario';

  let candidate = preferred;

  for (let counter = 1; counter <= 999; counter++) {
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;

    const suffix = String(counter);
    candidate = `${preferred.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`;
  }

  return `usuario${Date.now().toString().slice(-8)}`;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const {
      email,
      fullName,
      nationalId,
      instagramUsername,
      birthDate,
      purchaseProofImage,
      followsInstagram,
      password,
    } = parsed.data;

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const cleanNationalId = normalizeNationalId(nationalId);
    const cleanInstagramUsername = normalizeInstagramUsername(instagramUsername);
    const birthDateValue = new Date(`${birthDate}T00:00:00.000Z`);

    if (cleanNationalId.length < 5) {
      return reply.code(400).send({ error: 'Numero de cedula invalido' });
    }

    if (cleanInstagramUsername.length < 2) {
      return reply.code(400).send({ error: 'Usuario de Instagram invalido' });
    }

    if (Number.isNaN(birthDateValue.getTime())) {
      return reply.code(400).send({ error: 'Fecha de nacimiento invalida' });
    }

    if (birthDateValue > new Date()) {
      return reply.code(400).send({ error: 'La fecha de nacimiento no puede ser futura' });
    }

    const existsEmail = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
    if (existsEmail) return reply.code(409).send({ error: 'Ya existe una cuenta con este correo electronico' });

    const existsNationalId = await prisma.user.findUnique({
      where: { nationalId: cleanNationalId },
      select: { id: true },
    });
    if (existsNationalId) return reply.code(409).send({ error: 'Ya existe una cuenta con este numero de cedula' });

    const username = await buildUniqueUsername(cleanFullName, cleanEmail, cleanNationalId);

    try {
      const user = await prisma.user.create({
        data: {
          email: cleanEmail,
          username,
          fullName: cleanFullName,
          nationalId: cleanNationalId,
          instagramUsername: cleanInstagramUsername,
          birthDate: birthDateValue,
          purchaseProofImage,
          followsInstagram,
          passwordHash: await bcrypt.hash(password, 10),
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          nationalId: true,
          instagramUsername: true,
          birthDate: true,
          followsInstagram: true,
          role: true,
        },
      });

      return reply.send({ user });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(',')
          : String(error.meta?.target ?? '');
        if (target.includes('email')) {
          return reply.code(409).send({ error: 'Ya existe una cuenta con este correo electronico' });
        }
        if (target.includes('nationalId')) {
          return reply.code(409).send({ error: 'Ya existe una cuenta con este numero de cedula' });
        }
        return reply.code(409).send({ error: 'Ya existe una cuenta con los datos indicados' });
      }
      throw error;
    }
  });

  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const { identifier, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    const token = app.jwt.sign({ uid: user.id, role: user.role });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        nationalId: user.nationalId,
        instagramUsername: user.instagramUsername,
        birthDate: user.birthDate,
        followsInstagram: user.followsInstagram,
        role: user.role,
      },
    });
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req: FastifyRequest, reply) => {
    const uid = (req.user as any).uid as string;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        nationalId: true,
        instagramUsername: true,
        birthDate: true,
        followsInstagram: true,
        role: true,
        createdAt: true,
      },
    });
    return reply.send({ user });
  });
}
