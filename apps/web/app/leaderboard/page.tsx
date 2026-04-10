'use client';

import { useEffect, useState } from 'react';
import Nav from '../../components/Nav';

export default function GlobalLeaderboardInfo() {
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    setMsg('El ranking es por quiniela. Entra a una quiniela y abre su ranking.');
  }, []);

  return (
    <>
      <Nav />
      <div className="card">
        <h2 style={{marginTop:0}}>Ranking</h2>
        <div className="card">
          <p className="small">{msg}</p>
          <p className="small">Ir a: <b>Mis quinielas → Abrir → Ver ranking</b></p>
        </div>
      </div>
    </>
  );
}
