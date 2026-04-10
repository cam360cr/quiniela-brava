'use client';

import { useEffect, useState } from 'react';
import Nav from '../../components/Nav';
import { apiFetch } from '../../lib/api';
import { useMe } from '../../lib/hooks';

type Match = {
  id: string;
  kickoffAt: string;
  lockAt: string;
  finalHome: number | null;
  finalAway: number | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
};

type AdminLeague = {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  createdAt: string;
  createdBy: { username: string; email: string };
  _count: { members: number; matches: number; predictions: number };
};

type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'SUPERADMIN';
  createdAt: string;
  _count: { leagues: number; createdLeagues: number; predictions: number };
};

function parseScoreInput(raw: string, label: string) {
  const value = raw.trim();
  if (value === '') throw new Error(`${label} es obligatorio`);
  if (!/^\d+$/.test(value)) throw new Error(`${label} debe ser un numero entero`);

  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 99) {
    throw new Error(`${label} debe estar entre 0 y 99`);
  }

  return n;
}

export default function AdminPage() {
  const { me, loading } = useMe();
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState<string|null>(null);

  const [finalHome, setFinalHome] = useState<Record<string,string>>({});
  const [finalAway, setFinalAway] = useState<Record<string,string>>({});

  async function loadAdminData() {
    const [leagueResponse, userResponse] = await Promise.all([
      apiFetch<{leagues:AdminLeague[]}>('/admin/leagues'),
      apiFetch<{users:AdminUser[]}>('/admin/users'),
    ]);

    setLeagues(leagueResponse.leagues);
    setUsers(userResponse.users);
    setLeagueId((current) => current || leagueResponse.leagues[0]?.id || '');
  }

  useEffect(() => {
    (async () => {
      try{
        await loadAdminData();
      }catch(e:any){ setMsg(e.message); }
    })();
  }, []);

  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      try{
        const r = await apiFetch<{matches:Match[]}>(`/leagues/${leagueId}/matches`);
        setMatches(r.matches);
      }catch(e:any){ setMsg(e.message); }
    })();
  }, [leagueId]);

  const selectedLeague = leagues.find((league) => league.id === leagueId) ?? null;

  if (!loading && me?.role !== 'SUPERADMIN') {
    return (
      <>
        <Nav />
        <div className="card">
          <h2 style={{marginTop:0}}>Admin</h2>
          <div className="card">403 — Solo SUPERADMIN.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h2 style={{marginTop:0}}>Admin</h2>
        {msg && <div className="card">{msg}</div>}

        <div className="grid cols2">
          <div className="card" style={{marginTop:0}}>
            <h3 style={{marginTop:0}}>Todas las quinielas</h3>
            <div className="label">Quiniela activa</div>
            <select className="input" value={leagueId} onChange={e=>setLeagueId(e.target.value)}>
              {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
            </select>
            {selectedLeague && (
              <div style={{marginTop:12}} className="small">
                <div><b>Codigo:</b> {selectedLeague.joinCode}</div>
                <div><b>Creador:</b> @{selectedLeague.createdBy.username}</div>
                <div><b>Descripcion:</b> {selectedLeague.description || '-'}</div>
                <div><b>Miembros:</b> {selectedLeague._count.members}</div>
                <div><b>Partidos:</b> {selectedLeague._count.matches}</div>
                <div><b>Pronosticos:</b> {selectedLeague._count.predictions}</div>
              </div>
            )}
          </div>

          <div className="card" style={{marginTop:0}}>
            <h3 style={{marginTop:0}}>Todos los usuarios</h3>
            <table className="table">
              <thead>
                <tr><th>Usuario</th><th>Rol</th><th>Quinielas</th><th>Pronosticos</th></tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>@{user.username}<br /><span className="small">{user.email}</span></td>
                    <td>{user.role}</td>
                    <td>{user._count.createdLeagues} creadas / {user._count.leagues} unidas</td>
                    <td>{user._count.predictions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Cargar resultados</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Partido</th><th>Kickoff</th><th>Resultado</th><th>Nuevo</th><th></th>
              </tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.id}>
                  <td>{m.homeTeam.name} vs {m.awayTeam.name}</td>
                  <td>{new Date(m.kickoffAt).toLocaleString()}</td>
                  <td>{m.finalHome === null ? '-' : `${m.finalHome} - ${m.finalAway}`}</td>
                  <td>
                    <div className="row-actions">
                      <input className="input" style={{width:70}} value={finalHome[m.id] ?? ''} onChange={e=>setFinalHome(s=>({...s,[m.id]:e.target.value}))} />
                      <input className="input" style={{width:70}} value={finalAway[m.id] ?? ''} onChange={e=>setFinalAway(s=>({...s,[m.id]:e.target.value}))} />
                    </div>
                  </td>
                  <td>
                    <button className="btn green" onClick={async ()=>{
                      setMsg(null);
                      try{
                        const fh = parseScoreInput(finalHome[m.id] ?? '', 'Resultado local');
                        const fa = parseScoreInput(finalAway[m.id] ?? '', 'Resultado visitante');

                        const r = await apiFetch<{updatedPredictions:number}>(`/leagues/${leagueId}/matches/${m.id}/result`, {
                          method:'PATCH',
                          body: JSON.stringify({ finalHome: fh, finalAway: fa })
                        });

                        setMsg(`Resultado guardado. Predicciones recalculadas: ${r.updatedPredictions}`);
                        await loadAdminData();
                        const updated = await apiFetch<{matches:Match[]}>(`/leagues/${leagueId}/matches`);
                        setMatches(updated.matches);
                      }catch(e:any){ setMsg(e.message); }
                    }}>Guardar + recalcular</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">Solo el dueno de la quiniela puede guardar resultados. Al guardar, se recalculan puntos de esa quiniela.</p>
        </div>
      </div>
    </>
  );
}
