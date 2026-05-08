"use client";

import Link from 'next/link';
import Nav from '../components/Nav';
import { useMe } from '../lib/hooks';

export default function Page() {
  const { me, loading } = useMe();

  if (loading) {
    return (
      <>
        <Nav />
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Quiniela Brava</h1>
          <p className="small">Cargando...</p>
        </div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Nav />
        <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
          <h1 style={{ marginTop: 0 }}>Quiniela Brava</h1>
          <p className="small">
            Una sola cuenta para 3 modulos: Quiniela, Calendario Mundialista y Finalistas 2026.
          </p>
          <div className="grid cols3 module-grid">
            <div className="module-card">
              <h3>Quiniela</h3>
              <p className="small">Crea o unete a ligas, pronostica partidos y compite en el ranking.</p>
            </div>
            <div className="module-card">
              <h3>Calendario Mundialista</h3>
              <p className="small">Consulta grupos oficiales y fechas del Mundial FIFA 2026.</p>
            </div>
            <div className="module-card">
              <h3>Finalistas</h3>
              <p className="small">Registra tus 2 finalistas y tu campeon desde la misma cuenta.</p>
            </div>
          </div>
          <div className="grid cols2">
            <Link className="btn primary" href="/login" style={{ textAlign: 'center', padding: '14px 18px' }}>
              Entrar
            </Link>
            <Link className="btn" href="/register" style={{ textAlign: 'center', padding: '14px 18px' }}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Panel Principal</h1>
        <p className="small">
          Elige el modulo que quieres usar. Cada seccion funciona por separado y comparte tu misma cuenta.
        </p>

        <div className="grid cols3 module-grid">
          <div className="module-card">
            <h3>Quiniela</h3>
            <p className="small">Gestiona tus ligas, comparte codigos y carga pronosticos.</p>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Link className="btn primary" href="/leagues">Ir a quiniela</Link>
              <Link className="btn" href="/leaderboard">Ranking</Link>
            </div>
          </div>

          <div className="module-card">
            <h3>Calendario Mundialista</h3>
            <p className="small">Revisa grupos oficiales, fechas y cruces del Mundial 2026.</p>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Link className="btn" href="/mundial-2026">Abrir calendario</Link>
            </div>
          </div>

          <div className="module-card">
            <h3>Finalistas</h3>
            <p className="small">Guarda tus 2 finalistas y el campeon de tu prediccion.</p>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Link className="btn" href="/finalistas">Abrir finalistas</Link>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Tu cuenta</h3>
          <p className="small"><b>Usuario:</b> @{me.username}</p>
          <p className="small"><b>Rol:</b> {me.role}</p>
          {me.role === 'SUPERADMIN' && (
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Link className="btn green" href="/admin">Abrir admin por modulos</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
