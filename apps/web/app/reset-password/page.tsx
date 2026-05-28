'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { resetPassword } from '../../lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const tokenMissing = !token;

  return (
    <>
      <Nav />
      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Cambiar contrasena</h2>

        {tokenMissing ? (
          <>
            <p className="small" style={{ marginTop: 0 }}>
              El enlace de recuperacion no es valido. Solicita uno nuevo.
            </p>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Link className="btn primary" href="/forgot-password">Solicitar nuevo enlace</Link>
              <Link className="btn" href="/login">Volver</Link>
            </div>
          </>
        ) : (
          <>
            <p className="small" style={{ marginTop: 0 }}>
              Ingresa tu nueva contrasena. El enlace es valido por tiempo limitado.
            </p>

            {msg && <div className="card" style={{ marginTop: 10 }}>{msg}</div>}

            <div className="label">Nueva contrasena</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              autoComplete="new-password"
            />

            <div className="label">Confirmar contrasena</div>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contrasena"
              autoComplete="new-password"
            />

            <div className="row-actions" style={{ marginTop: 12 }}>
              <button
                className="btn primary"
                disabled={saving}
                onClick={async () => {
                  setMsg(null);

                  if (password.length < 6) {
                    setMsg('La contrasena debe tener al menos 6 caracteres.');
                    return;
                  }

                  if (password !== confirmPassword) {
                    setMsg('Las contrasenas no coinciden.');
                    return;
                  }

                  setSaving(true);
                  try {
                    const response = await resetPassword(token, password);
                    setMsg(response.message || 'Contrasena actualizada. Te redirigimos al login...');
                    setTimeout(() => router.push('/login'), 1200);
                  } catch (error: any) {
                    setMsg(error?.message ?? 'No se pudo cambiar la contrasena');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Guardando...' : 'Actualizar contrasena'}
              </button>
              <Link className="btn" href="/login">Cancelar</Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
