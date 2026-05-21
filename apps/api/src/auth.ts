import type { FastifyInstance, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { loginSchema, registerSchema } from './schemas.js';

function normalizeNationalId(value: string) {
  const compact = value.trim().replace(/\s+/g, '');
  const digitsOnly = compact.replace(/\D/g, '');
  return digitsOnly.length >= 5 ? digitsOnly : compact.toUpperCase();
}

function normalizeInstagramUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const {
      email,
      username,
      fullName,
      nationalId,
      instagramUsername,
      birthDate,
      purchaseProofImage,
      followsInstagram,
      password,
    } = parsed.data;

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = normalizeUsername(username);
    const cleanFullName = fullName.trim();
    const cleanNationalId = normalizeNationalId(nationalId);
    const cleanInstagramUsername = normalizeInstagramUsername(instagramUsername);
    const birthDateValue = new Date(`${birthDate}T00:00:00.000Z`);

    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      return reply.code(400).send({ error: 'El nombre de usuario debe tener entre 3 y 24 caracteres' });
    }

    if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
      return reply.code(400).send({ error: 'El nombre de usuario solo puede usar letras, numeros, punto y guion bajo' });
    }

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

    const existsUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
    if (existsUsername) return reply.code(409).send({ error: 'Ya existe una cuenta con este nombre de usuario' });

    const existsNationalId = await prisma.user.findUnique({
      where: { nationalId: cleanNationalId },
      select: { id: true },
    });
    if (existsNationalId) return reply.code(409).send({ error: 'Ya existe una cuenta con este numero de cedula' });

    try {
      const user = await prisma.user.create({
        data: {
          email: cleanEmail,
          username: cleanUsername,
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
        if (target.includes('username')) {
          return reply.code(409).send({ error: 'Ya existe una cuenta con este nombre de usuario' });
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
    const cleanIdentifier = identifier.trim();
    const cleanUsername = normalizeUsername(cleanIdentifier);
    const cleanNationalId = normalizeNationalId(cleanIdentifier);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: {
              equals: cleanIdentifier,
              mode: 'insensitive',
            },
          },
          {
            username: {
              equals: cleanUsername,
              mode: 'insensitive',
            },
          },
          { nationalId: cleanNationalId },
        ],
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
