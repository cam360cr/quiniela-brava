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
          <h1 style={{marginTop:0}}>Quinielas</h1>
          <p className="small">Cargando...</p>
        </div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Nav />
        <div className="card" style={{maxWidth:720, margin:'0 auto'}}>
          <h1 style={{marginTop:0}}>Quinielas</h1>
          <p className="small">
            Entra a tu cuenta o crea una nueva para empezar a crear quinielas, compartir codigos y jugar.
          </p>
          <div className="grid cols2">
            <Link className="btn primary" href="/login" style={{textAlign:'center', padding:'14px 18px'}}>
              Entrar
            </Link>
            <Link className="btn" href="/register" style={{textAlign:'center', padding:'14px 18px'}}>
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
        <h1 style={{marginTop:0}}>Quinielas</h1>
        <p className="small">
          Ya puedes entrar a tus quinielas, compartir codigos de acceso y seguir el ranking de tu grupo.
        </p>
        <div className="grid cols2">
          <div className="card" style={{marginTop:0}}>
            <h3 style={{marginTop:0}}>Siguiente paso</h3>
            <ol className="small">
              <li>Crea una quiniela o unete con un codigo</li>
              <li>Haz tus pronosticos antes del cierre</li>
              <li>Revisa el ranking de tu quiniela</li>
            </ol>
            <div className="row-actions" style={{marginTop:12}}>
              <Link className="btn primary" href="/leagues">Ir a mis quinielas</Link>
              <Link className="btn" href="/leaderboard">Ver ranking</Link>
            </div>
          </div>
          <div className="card" style={{marginTop:0}}>
            <h3 style={{marginTop:0}}>Tu cuenta</h3>
            <p className="small"><b>Usuario:</b> @{me.username}</p>
            <p className="small"><b>Rol:</b> {me.role}</p>
            {me.role === 'SUPERADMIN' && (
              <div className="row-actions" style={{marginTop:12}}>
                <Link className="btn green" href="/admin">Abrir admin</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
