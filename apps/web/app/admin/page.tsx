'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  createdBy: { username: string; email: string };
  _count: { members: number; matches: number; predictions: number };
};

type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'SUPERADMIN';
  _count: { leagues: number; createdLeagues: number; predictions: number };
};

type AdminTeam = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
};

type AdminFinalistTeam = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
};

type AdminFinalPick = {
  id: string;
  user: { id: string; email: string; username: string };
  profile: { fullName: string; nationalId: string; phone: string } | null;
  finalist1Team: { name: string; code: string | null };
  finalist2Team: { name: string; code: string | null };
  championTeam: { name: string; code: string | null };
  updatedAt: string;
};

type AdminTab = 'quiniela' | 'calendario' | 'finalistas';

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
  const [tab, setTab] = useState<AdminTab>('quiniela');
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [finalHome, setFinalHome] = useState<Record<string, string>>({});
  const [finalAway, setFinalAway] = useState<Record<string, string>>({});

  const [syncSeason, setSyncSeason] = useState('2026');
  const [syncExternalLeagueId, setSyncExternalLeagueId] = useState('1');
  const [syncFrom, setSyncFrom] = useState('');
  const [syncTo, setSyncTo] = useState('');

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamIdEditing, setTeamIdEditing] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');

  const [finalistTeams, setFinalistTeams] = useState<AdminFinalistTeam[]>([]);
  const [finalistTeamIdEditing, setFinalistTeamIdEditing] = useState<string | null>(null);
  const [finalistTeamName, setFinalistTeamName] = useState('');
  const [finalistTeamCode, setFinalistTeamCode] = useState('');
  const [finalistTeamLogoUrl, setFinalistTeamLogoUrl] = useState('');

  const [finalPickSeason, setFinalPickSeason] = useState('2026');
  const [finalPicks, setFinalPicks] = useState<AdminFinalPick[]>([]);

  async function loadCore() {
    const [leagueResponse, userResponse] = await Promise.all([
      apiFetch<{ leagues: AdminLeague[] }>('/admin/leagues'),
      apiFetch<{ users: AdminUser[] }>('/admin/users'),
    ]);

    setLeagues(leagueResponse.leagues);
    setUsers(userResponse.users);
    setLeagueId((current) => current || leagueResponse.leagues[0]?.id || '');
  }

  async function loadMatches(currentLeagueId: string) {
    if (!currentLeagueId) return;
    const r = await apiFetch<{ matches: Match[] }>(`/leagues/${currentLeagueId}/matches`);
    setMatches(r.matches);
  }

  async function loadTeams() {
    const r = await apiFetch<{ teams: AdminTeam[] }>('/admin/teams');
    setTeams(r.teams);
  }

  async function loadFinalPicks(season: string) {
    const year = Number(season || '2026');
    const r = await apiFetch<{ picks: AdminFinalPick[] }>(`/admin/final-picks?season=${year}`);
    setFinalPicks(r.picks);
  }

  async function loadFinalistTeams() {
    const r = await apiFetch<{ teams: AdminFinalistTeam[] }>('/admin/finalist-teams');
    setFinalistTeams(r.teams);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadCore();
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar admin');
      }
    })();
  }, []);

  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      try {
        await loadMatches(leagueId);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar partidos');
      }
    })();
  }, [leagueId]);

  useEffect(() => {
    if (tab !== 'calendario') return;
    (async () => {
      try {
        await loadTeams();
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar equipos');
      }
    })();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'finalistas') return;
    (async () => {
      try {
        await loadFinalistTeams();
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar equipos de finalistas');
      }
    })();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'finalistas') return;
    (async () => {
      try {
        await loadFinalPicks(finalPickSeason);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar picks de finalistas');
      }
    })();
  }, [tab, finalPickSeason]);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === leagueId) ?? null,
    [leagues, leagueId]
  );

  function resetTeamForm() {
    setTeamIdEditing(null);
    setTeamName('');
    setTeamCode('');
    setTeamLogoUrl('');
  }

  async function saveTeam() {
    setMsg(null);
    const payload = {
      name: teamName,
      code: teamCode || null,
      logoUrl: teamLogoUrl || null,
    };

    if (teamIdEditing) {
      await apiFetch(`/admin/teams/${teamIdEditing}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setMsg('Equipo actualizado.');
    } else {
      await apiFetch('/admin/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMsg('Equipo creado.');
    }

    await loadTeams();
    resetTeamForm();
  }

  function resetFinalistTeamForm() {
    setFinalistTeamIdEditing(null);
    setFinalistTeamName('');
    setFinalistTeamCode('');
    setFinalistTeamLogoUrl('');
  }

  async function saveFinalistTeam() {
    setMsg(null);
    const payload = {
      name: finalistTeamName,
      code: finalistTeamCode || null,
      logoUrl: finalistTeamLogoUrl || null,
    };

    if (finalistTeamIdEditing) {
      await apiFetch(`/admin/finalist-teams/${finalistTeamIdEditing}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setMsg('Equipo de finalistas actualizado.');
    } else {
      await apiFetch('/admin/finalist-teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMsg('Equipo de finalistas creado.');
    }

    await loadFinalistTeams();
    resetFinalistTeamForm();
  }

  async function runSync() {
    if (!leagueId) {
      setMsg('Selecciona una quiniela para sincronizar calendario.');
      return;
    }

    setMsg(null);
    const season = Number(syncSeason || '2026');
    const externalLeagueId = Number(syncExternalLeagueId || '1');
    const body: any = { season, externalLeagueId };
    if (syncFrom) body.from = syncFrom;
    if (syncTo) body.to = syncTo;

    const result = await apiFetch<any>(`/leagues/${leagueId}/sync/fixtures`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setMsg(`Sync calendario ok. Creados: ${result.sync.created}, actualizados: ${result.sync.updated}.`);
    await loadMatches(leagueId);
  }

  if (!loading && me?.role !== 'SUPERADMIN') {
    return (
      <>
        <Nav />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Admin</h2>
          <div className="card">403 - Solo SUPERADMIN.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Admin por Modulos</h1>
        <p className="small" style={{ marginTop: 0 }}>
          Gestion separada para Quiniela, Calendario y Finalistas.
        </p>

        {msg && (
          <div className="card">
            <p className="small" style={{ margin: 0 }}>{msg}</p>
          </div>
        )}

        <div className="admin-tabs">
          <button className={`btn ${tab === 'quiniela' ? 'primary' : ''}`} onClick={() => setTab('quiniela')}>Quiniela</button>
          <button className={`btn ${tab === 'calendario' ? 'primary' : ''}`} onClick={() => setTab('calendario')}>Calendario</button>
          <button className={`btn ${tab === 'finalistas' ? 'primary' : ''}`} onClick={() => setTab('finalistas')}>Finalistas</button>
        </div>

        {tab === 'quiniela' && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Modulo Quiniela</h2>

            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Ligas y control</h3>
                <div className="label">Liga activa</div>
                <select className="input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
                  {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                </select>

                {selectedLeague && (
                  <div style={{ marginTop: 12 }} className="small">
                    <div><b>Codigo:</b> {selectedLeague.joinCode}</div>
                    <div><b>Creador:</b> @{selectedLeague.createdBy.username}</div>
                    <div><b>Descripcion:</b> {selectedLeague.description || '-'}</div>
                    <div><b>Miembros:</b> {selectedLeague._count.members}</div>
                    <div><b>Partidos:</b> {selectedLeague._count.matches}</div>
                    <div><b>Pronosticos:</b> {selectedLeague._count.predictions}</div>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Usuarios del sistema</h3>
                <table className="table">
                  <thead>
                    <tr><th>Usuario</th><th>Rol</th><th>Quinielas</th><th>Pronosticos</th></tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>@{user.username}<br /><span className="small">{user.email}</span></td>
                        <td>{user.role}</td>
                        <td>{user._count.createdLeagues} / {user._count.leagues}</td>
                        <td>{user._count.predictions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Resultados de partidos</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Partido</th><th>Kickoff</th><th>Actual</th><th>Nuevo</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td>{m.homeTeam.name} vs {m.awayTeam.name}</td>
                      <td>{new Date(m.kickoffAt).toLocaleString()}</td>
                      <td>{m.finalHome === null ? '-' : `${m.finalHome} - ${m.finalAway}`}</td>
                      <td>
                        <div className="row-actions">
                          <input className="input" style={{ width: 70 }} value={finalHome[m.id] ?? ''} onChange={(e) => setFinalHome((s) => ({ ...s, [m.id]: e.target.value }))} />
                          <input className="input" style={{ width: 70 }} value={finalAway[m.id] ?? ''} onChange={(e) => setFinalAway((s) => ({ ...s, [m.id]: e.target.value }))} />
                        </div>
                      </td>
                      <td>
                        <button className="btn green" onClick={async () => {
                          setMsg(null);
                          try {
                            const fh = parseScoreInput(finalHome[m.id] ?? '', 'Resultado local');
                            const fa = parseScoreInput(finalAway[m.id] ?? '', 'Resultado visitante');

                            const r = await apiFetch<{ updatedPredictions: number }>(`/leagues/${leagueId}/matches/${m.id}/result`, {
                              method: 'PATCH',
                              body: JSON.stringify({ finalHome: fh, finalAway: fa }),
                            });

                            setMsg(`Resultado guardado. Predicciones recalculadas: ${r.updatedPredictions}`);
                            await loadMatches(leagueId);
                          } catch (e: any) {
                            setMsg(e?.message ?? 'No se pudo guardar resultado');
                          }
                        }}>Guardar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Modulo Calendario Mundialista</h2>

            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Sync de fixtures</h3>
                <p className="small">Sincroniza partidos reales para la liga seleccionada.</p>

                <div className="label">Liga destino</div>
                <select className="input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
                  {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                </select>

                <div className="label">Season</div>
                <input className="input" value={syncSeason} onChange={(e) => setSyncSeason(e.target.value)} />

                <div className="label">External League Id</div>
                <input className="input" value={syncExternalLeagueId} onChange={(e) => setSyncExternalLeagueId(e.target.value)} />

                <div className="grid cols2">
                  <div>
                    <div className="label">Desde (YYYY-MM-DD)</div>
                    <input className="input" value={syncFrom} onChange={(e) => setSyncFrom(e.target.value)} placeholder="2026-06-11" />
                  </div>
                  <div>
                    <div className="label">Hasta (YYYY-MM-DD)</div>
                    <input className="input" value={syncTo} onChange={(e) => setSyncTo(e.target.value)} placeholder="2026-07-19" />
                  </div>
                </div>

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={async () => {
                    try {
                      await runSync();
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo sincronizar calendario');
                    }
                  }}>Sincronizar calendario</button>
                </div>
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Gestion de equipos</h3>
                <p className="small">Estos equipos alimentan calendario y finalistas.</p>

                <div className="label">Nombre</div>
                <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ej: Costa Rica" />

                <div className="grid cols2">
                  <div>
                    <div className="label">Codigo</div>
                    <input className="input" value={teamCode} onChange={(e) => setTeamCode(e.target.value.toUpperCase())} placeholder="CRC" />
                  </div>
                  <div>
                    <div className="label">Logo URL</div>
                    <input className="input" value={teamLogoUrl} onChange={(e) => setTeamLogoUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={async () => {
                    try {
                      await saveTeam();
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo guardar equipo');
                    }
                  }}>{teamIdEditing ? 'Actualizar equipo' : 'Crear equipo'}</button>
                  {teamIdEditing && <button className="btn" onClick={resetTeamForm}>Cancelar</button>}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Catalogo de equipos</h3>
              <table className="table">
                <thead>
                  <tr><th>Nombre</th><th>Codigo</th><th>Logo</th><th></th></tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>{team.code || '-'}</td>
                      <td className="small">{team.logoUrl ? 'Configurado' : '-'}</td>
                      <td>
                        <button className="btn" onClick={() => {
                          setTeamIdEditing(team.id);
                          setTeamName(team.name);
                          setTeamCode(team.code || '');
                          setTeamLogoUrl(team.logoUrl || '');
                        }}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'finalistas' && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Modulo Finalistas</h2>

            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Equipos para concurso</h3>
                <p className="small">Este catalogo es exclusivo de Finalistas y no afecta la quiniela.</p>

                <div className="label">Nombre</div>
                <input className="input" value={finalistTeamName} onChange={(e) => setFinalistTeamName(e.target.value)} placeholder="Ej: Costa Rica" />

                <div className="grid cols2">
                  <div>
                    <div className="label">Codigo</div>
                    <input className="input" value={finalistTeamCode} onChange={(e) => setFinalistTeamCode(e.target.value.toUpperCase())} placeholder="CRC" />
                  </div>
                  <div>
                    <div className="label">Logo URL</div>
                    <input className="input" value={finalistTeamLogoUrl} onChange={(e) => setFinalistTeamLogoUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={async () => {
                    try {
                      await saveFinalistTeam();
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo guardar equipo');
                    }
                  }}>{finalistTeamIdEditing ? 'Actualizar equipo' : 'Crear equipo'}</button>
                  {finalistTeamIdEditing && <button className="btn" onClick={resetFinalistTeamForm}>Cancelar</button>}
                </div>
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Temporada</h3>
                <div style={{ maxWidth: 220 }}>
                  <div className="label">Temporada</div>
                  <input className="input" value={finalPickSeason} onChange={(e) => setFinalPickSeason(e.target.value)} />
                </div>

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={async () => {
                    try {
                      await loadFinalPicks(finalPickSeason);
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo refrescar picks');
                    }
                  }}>Refrescar picks</button>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Catalogo de equipos</h3>
              {!finalistTeams.length ? (
                <p className="small" style={{ margin: 0 }}>No hay equipos cargados.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Nombre</th><th>Codigo</th><th>Logo</th><th></th></tr>
                  </thead>
                  <tbody>
                    {finalistTeams.map((team) => (
                      <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>{team.code || '-'}</td>
                        <td className="small">{team.logoUrl ? 'Configurado' : '-'}</td>
                        <td>
                          <button className="btn" onClick={() => {
                            setFinalistTeamIdEditing(team.id);
                            setFinalistTeamName(team.name);
                            setFinalistTeamCode(team.code || '');
                            setFinalistTeamLogoUrl(team.logoUrl || '');
                          }}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Registros de finalistas</h3>
              {!finalPicks.length ? (
                <p className="small" style={{ margin: 0 }}>No hay registros para esa temporada.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Usuario</th><th>Datos</th><th>Finalistas</th><th>Campeon</th><th>Actualizado</th></tr>
                  </thead>
                  <tbody>
                    {finalPicks.map((pick) => (
                      <tr key={pick.id}>
                        <td>@{pick.user.username}<br /><span className="small">{pick.user.email}</span></td>
                        <td className="small">
                          <div>{pick.profile?.fullName || '-'}</div>
                          <div>Cedula: {pick.profile?.nationalId || '-'}</div>
                          <div>Tel: {pick.profile?.phone || '-'}</div>
                        </td>
                        <td>{pick.finalist1Team.name} vs {pick.finalist2Team.name}</td>
                        <td>{pick.championTeam.name}</td>
                        <td className="small">{new Date(pick.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="row-actions" style={{ marginTop: 8 }}>
              <Link className="btn" href="/finalistas">Ver landing de usuario</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
