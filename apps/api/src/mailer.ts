import nodemailer from 'nodemailer';

type PasswordResetEmailInput = {
  to: string;
  name?: string | null;
  resetUrl: string;
};

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type MailSendResult = {
  sent: boolean;
  reason?: 'missing-config';
  messageId?: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedTransporterKey: string | null = null;

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  return fallback;
}

function getMailerConfig(): MailerConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const parsedPort = Number(process.env.SMTP_PORT || '465');
  const port = Number.isFinite(parsedPort) ? parsedPort : 465;
  const secure = parseBooleanEnv(process.env.SMTP_SECURE, port === 465);
  const from = process.env.SMTP_FROM?.trim() || user;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

function getTransporter(config: MailerConfig) {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  cachedTransporterKey = key;
  return cachedTransporter;
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<MailSendResult> {
  const config = getMailerConfig();
  if (!config) {
    return { sent: false, reason: 'missing-config' };
  }

  const displayName = input.name?.trim() || 'usuario';
  const subject = 'Recuperacion de contrasena - Quiniela Mundialista';
  const text = [
    `Hola ${displayName},`,
    '',
    'Recibimos una solicitud para restablecer tu contrasena.',
    'Puedes cambiarla usando este enlace:',
    input.resetUrl,
    '',
    'Este enlace vence en 60 minutos.',
    'Si no solicitaste este cambio, ignora este correo.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
      <p>Hola ${displayName},</p>
      <p>Recibimos una solicitud para restablecer tu contrasena.</p>
      <p>
        <a href="${input.resetUrl}" style="display:inline-block;padding:10px 14px;background:#ffd100;color:#111;text-decoration:none;border-radius:6px;font-weight:700;">
          Cambiar contrasena
        </a>
      </p>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>Este enlace vence en 60 minutos.</p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    </div>
  `;

  try {
    const transporter = getTransporter(config);
    const info = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject,
      text,
      html,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    cachedTransporter = null;
    cachedTransporterKey = null;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`EMAIL_SEND_FAILED: ${message}`);
  }
}
