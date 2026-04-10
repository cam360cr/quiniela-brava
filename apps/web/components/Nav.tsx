'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '../lib/auth';
import { useMe } from '../lib/hooks';

export default function Nav() {
  const { me, loading } = useMe();
  const router = useRouter();
  const showMenu = !loading && Boolean(me);

  return (
    <div className="nav">
      <div className="brand">
        <span className="brand-main">Quiniela</span>
        <span className="badge">Mundialista</span>
      </div>

      <div className="links">
        {showMenu && <Link className="btn" href="/">Inicio</Link>}
        {showMenu && <Link className="btn" href="/leagues">Mis quinielas</Link>}
        {showMenu && <Link className="btn" href="/leaderboard">Ranking</Link>}
        {!loading && me?.role === 'SUPERADMIN' && <Link className="btn green" href="/admin">Admin</Link>}
        {!loading && me ? (
          <>
            <span className="pill">@{me.username} <span className="badge">{me.role}</span></span>
            <button className="btn" onClick={() => { logout(); router.push('/login'); }}>Salir</button>
          </>
        ) : (
          <>
            <Link className="btn primary" href="/login">Entrar</Link>
            <Link className="btn" href="/register">Crear cuenta</Link>
          </>
        )}
      </div>
    </div>
  );
}
