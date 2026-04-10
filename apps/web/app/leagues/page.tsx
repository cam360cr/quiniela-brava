'use client';

import { useEffect, useState } from 'react';
import Nav from '../../components/Nav';
import { apiFetch } from '../../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type League = { id: string; name: string; description?: string; joinCode: string };

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [msg, setMsg] = useState<string|null>(null);
  const [name, setName] = useState('Mi Quiniela');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const router = useRouter();

  async function load() {
    const r = await apiFetch<{leagues:League[]}>('/leagues/mine');
    setLeagues(r.leagues);
  }

  useEffect(() => { load().catch(e=>setMsg(e.message)); }, []);

  return (
    <>
      <Nav />
      <div className="card">
        <h2 style={{marginTop:0}}>Mis quinielas</h2>
        {msg && <div className="card">{msg}</div>}

        <div className="grid cols2">
          <div className="card" style={{marginTop:0}}>
            <h3 style={{marginTop:0}}>Crear quiniela</h3>
            <div className="label">Nombre</div>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} />

            <div className="label">Descripción</div>
            <input className="input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descripción opcional" />

            <div style={{marginTop:12}} className="row-actions">
              <button className="btn primary" onClick={async ()=>{
                setMsg(null);
                try{
                  const r = await apiFetch<{league:any}>('/leagues', { method:'POST', body: JSON.stringify({ name, description: description || undefined }) });
                  await load();
                  router.push(`/leagues/${r.league.id}`);
                }catch(e:any){ setMsg(e.message); }
              }}>Crear</button>
            </div>
          </div>

          <div className="card" style={{marginTop:0}}>
            <h3 style={{marginTop:0}}>Unirme por codigo</h3>
            <div className="label">Codigo</div>
            <input className="input" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="DEMO12" />
            <div style={{marginTop:12}} className="row-actions">
              <button className="btn green" onClick={async ()=>{
                setMsg(null);
                try{
                  const r = await apiFetch<{leagueId:string}>('/leagues/join', { method:'POST', body: JSON.stringify({ joinCode }) });
                  await load();
                  router.push(`/leagues/${r.leagueId}`);
                }catch(e:any){ setMsg(e.message); }
              }}>Unirme</button>
            </div>
            <p className="small">Tip: quiniela demo = <b>DEMO12</b></p>
          </div>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Tus quinielas</h3>
          {leagues.length === 0 ? (
            <p className="small">No tenés quinielas aún.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Quiniela</th><th>Descripción</th><th>Código</th><th></th></tr></thead>
              <tbody>
                {leagues.map(l => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.description || '-'}</td>
                    <td><b>{l.joinCode}</b></td>
                    <td><Link className="btn" href={`/leagues/${l.id}`}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  );
}
