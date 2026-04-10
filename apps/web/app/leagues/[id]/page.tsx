'use client';

import { useEffect, useState } from 'react';
import Nav from '../../../components/Nav';
import { apiFetch } from '../../../lib/api';
import Link from 'next/link';

type MatchItem = {
  id: string;
  kickoffAt: string;
  lockAt: string;
  finalHome: number | null;
  finalAway: number | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  myPrediction: { predHome: number; predAway: number; points: number | null } | null;
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

export default function LeaguePage({ params }: { params: { id: string } }) {
  const leagueId = params.id;

  const [league, setLeague] = useState<any>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  const [predHome, setPredHome] = useState<Record<string, string>>({});
  const [predAway, setPredAway] = useState<Record<string, string>>({});
  const [resultHome, setResultHome] = useState<Record<string, string>>({});
  const [resultAway, setResultAway] = useState<Record<string, string>>({});
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [kickoffAt, setKickoffAt] = useState('');
  const [lockAt, setLockAt] = useState('');

  async function load() {
    const r = await apiFetch<{league:any; matches: MatchItem[]; canManage: boolean}>(`/leagues/${leagueId}/matches`);
    setLeague(r.league);
    setMatches(r.matches);
    setCanManage(r.canManage);

    // preload
    const ph: any = {};
    const pa: any = {};
    const rh: any = {};
    const ra: any = {};
    r.matches.forEach(m => {
      if (m.myPrediction) {
        ph[m.id] = String(m.myPrediction.predHome);
        pa[m.id] = String(m.myPrediction.predAway);
      }
      if (m.finalHome !== null && m.finalAway !== null) {
        rh[m.id] = String(m.finalHome);
        ra[m.id] = String(m.finalAway);
      }
    });
    setPredHome(ph);
    setPredAway(pa);
    setResultHome(rh);
    setResultAway(ra);
  }

  useEffect(() => { load().catch(e=>setMsg(e.message)); }, [leagueId]);
  return (
    <>
      <Nav />
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
          <div>
            <h2 style={{marginTop:0}}>{league?.name || 'Quiniela'}</h2>
            {league?.description && <div className="small">{league.description}</div>}
            <div className="small">Codigo para entrar a esta quiniela: <b>{league?.joinCode}</b></div>
          </div>
          <div className="row-actions">
            <Link className="btn" href={`/leagues/${leagueId}/leaderboard`}>Ver ranking</Link>
            <Link className="btn" href="/leagues">Volver</Link>
          </div>
        </div>

        {msg && <div className="card">{msg}</div>}

        {canManage && (
          <div className="card">
            <h3 style={{marginTop:0}}>Crear partido</h3>
            <div className="grid cols2">
              <div>
                <div className="label">Equipo local</div>
                <input className="input" value={homeTeam} onChange={e=>setHomeTeam(e.target.value)} placeholder="Costa Rica" />
              </div>
              <div>
                <div className="label">Equipo visitante</div>
                <input className="input" value={awayTeam} onChange={e=>setAwayTeam(e.target.value)} placeholder="Argentina" />
              </div>
              <div>
                <div className="label">Kickoff</div>
                <input className="input" type="datetime-local" value={kickoffAt} onChange={e=>setKickoffAt(e.target.value)} />
              </div>
              <div>
                <div className="label">Cierre</div>
                <input className="input" type="datetime-local" value={lockAt} onChange={e=>setLockAt(e.target.value)} />
              </div>
            </div>
            <div style={{marginTop:12}} className="row-actions">
              <button className="btn primary" onClick={async ()=>{
                setMsg(null);
                try {
                  if (!homeTeam.trim() || !awayTeam.trim() || !kickoffAt) throw new Error('Completa el partido');
                  await apiFetch(`/leagues/${leagueId}/matches`, {
                    method: 'POST',
                    body: JSON.stringify({
                      homeTeam,
                      awayTeam,
                      kickoffAt: new Date(kickoffAt).toISOString(),
                      lockAt: lockAt ? new Date(lockAt).toISOString() : undefined,
                    }),
                  });
                  setHomeTeam('');
                  setAwayTeam('');
                  setKickoffAt('');
                  setLockAt('');
                  await load();
                } catch (e:any) {
                  setMsg(e.message);
                }
              }}>Agregar partido</button>
            </div>
          </div>
        )}

        <div className="card">
          <h3 style={{marginTop:0}}>Partidos</h3>
          {matches.length === 0 ? (
            <p className="small">Esta quiniela todavia no tiene partidos. {canManage ? 'Agrega el primero arriba.' : 'Espera a que el creador agregue partidos.'}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Partido</th><th>Kickoff</th><th>Cierre</th><th>Tu pronóstico</th><th>Resultado final</th><th>Puntos</th><th></th>
                </tr>
              </thead>
              <tbody>
                {matches.map(m => {
                  const locked = new Date(m.lockAt) <= new Date();
                  const currentPredHome = (predHome[m.id] ?? '').trim();
                  const currentPredAway = (predAway[m.id] ?? '').trim();
                  const savedPredHome = m.myPrediction ? String(m.myPrediction.predHome) : '';
                  const savedPredAway = m.myPrediction ? String(m.myPrediction.predAway) : '';
                  const predictionSaved = !!m.myPrediction && currentPredHome === savedPredHome && currentPredAway === savedPredAway;
                  const predictionDirty = currentPredHome !== savedPredHome || currentPredAway !== savedPredAway;

                  const currentResultHome = (resultHome[m.id] ?? '').trim();
                  const currentResultAway = (resultAway[m.id] ?? '').trim();
                  const savedResultHome = m.finalHome === null ? '' : String(m.finalHome);
                  const savedResultAway = m.finalAway === null ? '' : String(m.finalAway);
                  const resultSaved = m.finalHome !== null && m.finalAway !== null && currentResultHome === savedResultHome && currentResultAway === savedResultAway;
                  const resultDirty = currentResultHome !== savedResultHome || currentResultAway !== savedResultAway;
                  return (
                    <tr key={m.id}>
                      <td>{m.homeTeam.name} vs {m.awayTeam.name}</td>
                      <td>{new Date(m.kickoffAt).toLocaleString()}</td>
                      <td>{new Date(m.lockAt).toLocaleString()}</td>
                      <td style={{minWidth:200}}>
                        <div className="row-actions">
                          <input className={`input ${predictionSaved ? 'input-saved' : ''} ${predictionDirty ? 'input-dirty' : ''}`} style={{width:70}} disabled={locked}
                            value={predHome[m.id] ?? ''} onChange={e=>setPredHome(s=>({...s,[m.id]:e.target.value}))} />
                          <input className={`input ${predictionSaved ? 'input-saved' : ''} ${predictionDirty ? 'input-dirty' : ''}`} style={{width:70}} disabled={locked}
                            value={predAway[m.id] ?? ''} onChange={e=>setPredAway(s=>({...s,[m.id]:e.target.value}))} />
                        </div>
                        {predictionSaved && <div className="small saved-note">Pronostico guardado</div>}
                        {!predictionSaved && predictionDirty && <div className="small dirty-note">Cambios sin guardar</div>}
                      </td>
                      <td style={{minWidth:220}}>
                        {canManage ? (
                          <div className="row-actions">
                            <input
                              className={`input ${resultSaved ? 'input-saved' : ''} ${resultDirty ? 'input-dirty' : ''}`}
                              style={{width:70}}
                              value={resultHome[m.id] ?? ''}
                              onChange={e=>setResultHome(s=>({...s,[m.id]:e.target.value}))}
                            />
                            <input
                              className={`input ${resultSaved ? 'input-saved' : ''} ${resultDirty ? 'input-dirty' : ''}`}
                              style={{width:70}}
                              value={resultAway[m.id] ?? ''}
                              onChange={e=>setResultAway(s=>({...s,[m.id]:e.target.value}))}
                            />
                            <button
                              className="btn green"
                              onClick={async ()=>{
                                setMsg(null);
                                try {
                                  const fh = parseScoreInput(resultHome[m.id] ?? '', 'Resultado local');
                                  const fa = parseScoreInput(resultAway[m.id] ?? '', 'Resultado visitante');

                                  await apiFetch(`/leagues/${leagueId}/matches/${m.id}/result`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ finalHome: fh, finalAway: fa }),
                                  });
                                  await load();
                                } catch (e:any) {
                                  setMsg(e.message);
                                }
                              }}
                            >Guardar resultado</button>
                          </div>
                        ) : (
                          <>{m.finalHome === null ? '-' : `${m.finalHome} - ${m.finalAway}`}</>
                        )}
                        {canManage && resultSaved && <div className="small saved-note">Resultado guardado</div>}
                        {canManage && !resultSaved && resultDirty && <div className="small dirty-note">Resultado sin guardar</div>}
                      </td>
                      <td>
                        {m.myPrediction?.points ?? '-'}
                      </td>
                      <td>
                        <button className="btn primary" disabled={locked}
                          onClick={async ()=>{
                            setMsg(null);
                            try{
                              const ph = parseScoreInput(predHome[m.id] ?? '', 'Pronostico local');
                              const pa = parseScoreInput(predAway[m.id] ?? '', 'Pronostico visitante');
                              await apiFetch(`/leagues/${leagueId}/predictions`, {
                                method:'POST',
                                body: JSON.stringify({ matchId: m.id, predHome: ph, predAway: pa })
                              });
                              await load();
                            }catch(e:any){ setMsg(e.message); }
                          }}>
                          Guardar pronostico
                        </button>
                        {locked && <div className="small">Cerrado</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="small">Los puntos aparecen cuando el dueno de la quiniela carga resultados finales.</p>
        </div>
      </div>
    </>
  );
}
