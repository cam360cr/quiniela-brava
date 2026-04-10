import type { FastifyInstance, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { loginSchema, registerSchema } from './schemas.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });

    const { email, username, password } = parsed.data;

    const existsEmail = await prisma.user.findUnique({ where: { email } });
    if (existsEmail) return reply.code(409).send({ error: 'Email already in use' });

    const existsUser = await prisma.user.findUnique({ where: { username } });
    if (existsUser) return reply.code(409).send({ error: 'Username already in use' });

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true, email: true, username: true, role: true },
    });

    return reply.send({ user });
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
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req: FastifyRequest, reply) => {
    const uid = (req.user as any).uid as string;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });
    return reply.send({ user });
  });
}
