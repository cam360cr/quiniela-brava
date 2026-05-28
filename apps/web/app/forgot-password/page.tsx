'use client';

import { useState } from 'react';
import Link from 'next/link';
import Nav from '../../components/Nav';
import { requestPasswordReset } from '../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string | null>(null);

  return (
    <>
      <Nav />
      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Recuperar contrasena</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Escribe tu correo y te enviaremos un enlace para cambiar tu contrasena.
        </p>

        {msg && <div className="card" style={{ marginTop: 10 }}>{msg}</div>}

        {debugStatus && (
          <div className="card" style={{ marginTop: 10 }}>
            <div className="small"><strong>Debug localhost:</strong> {debugStatus}</div>
            {debugResetUrl && (
              <div style={{ marginTop: 8 }}>
                <a className="small" href={debugResetUrl}>Abrir enlace de recuperacion</a>
              </div>
            )}
          </div>
        )}

        <div className="label">Correo electronico</div>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
        />

        <div className="row-actions" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            disabled={sending}
            onClick={async () => {
              setMsg(null);
              setDebugResetUrl(null);
              setDebugStatus(null);
              setSending(true);
              try {
                const response = await requestPasswordReset(email);
                setMsg(response.message || 'Si el correo existe, te enviamos instrucciones.');

                if (response.debug) {
                  if (typeof response.debug.userFound === 'boolean') {
                    if (!response.debug.userFound) {
                      setDebugStatus('No se encontro usuario con ese correo en la base de datos');
                    }
                  }

                  if (response.debug.mailSent === true) {
                    const id = response.debug.messageId ? ` (messageId: ${response.debug.messageId})` : '';
                    const destination = response.debug.to ? ` a ${response.debug.to}` : '';
                    setDebugStatus(`Correo enviado correctamente${destination}${id}`);
                  } else if (response.debug.mailSent === false) {
                    const reason = response.debug.error ? `: ${response.debug.error}` : '';
                    const destination = response.debug.to ? ` a ${response.debug.to}` : '';
                    if (response.debug.userFound !== false) {
                      setDebugStatus(`Fallo al enviar correo${destination}${reason}`);
                    }
                  }

                  if (response.debug.resetUrl) {
                    setDebugResetUrl(response.debug.resetUrl);
                  }
                }
              } catch (error: any) {
                setMsg(error?.message ?? 'No se pudo procesar la solicitud');
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? 'Enviando...' : 'Enviar enlace'}
          </button>
          <Link className="btn" href="/login">Volver a entrar</Link>
        </div>
      </div>
    </>
  );
}
