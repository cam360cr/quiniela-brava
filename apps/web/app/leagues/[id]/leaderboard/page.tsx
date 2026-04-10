'use client';

import { useEffect, useState } from 'react';
import Nav from '../../../../components/Nav';
import { apiFetch } from '../../../../lib/api';
import Link from 'next/link';

export default function LeaderboardPage({ params }: { params: { id: string } }) {
  const leagueId = params.id;
  const [rows, setRows] = useState<{username:string; totalPoints:number}[]>([]);
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    apiFetch<{leaderboard:any[]}>(`/leagues/${leagueId}/leaderboard`)
      .then(r => setRows(r.leaderboard))
      .catch(e => setMsg(e.message));
  }, [leagueId]);

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row-actions" style={{justifyContent:'space-between'}}>
          <h2 style={{margin:0}}>Ranking de la quiniela</h2>
          <Link className="btn" href={`/leagues/${leagueId}`}>Volver</Link>
        </div>
        {msg && <div className="card">{msg}</div>}
        <div className="card">
          <table className="table">
            <thead><tr><th>#</th><th>Usuario</th><th>Puntos</th></tr></thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.username}>
                  <td>{idx+1}</td>
                  <td>@{r.username}</td>
                  <td><b>{r.totalPoints}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
