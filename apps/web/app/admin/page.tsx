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
  createdBy: { username: string; email: string; fullName?: string | null };
  _count: { members: number; matches: number; predictions: number };
};

type AdminUser = {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  nationalId: string | null;
  instagramUsername: string | null;
  birthDate: string | null;
  followsInstagram: boolean;
  purchaseProofImage: string | null;
  hasPurchaseProof?: boolean;
  role: 'USER' | 'SUPERADMIN';
  _count: { leagues: number; createdLeagues: number; predictions: number };
};

type AdminTeam = {
  id: string;
  leagueId: string | null;
  name: string;
  code: string | null;
  logoUrl: string | null;
};

type AdminTab = 'quiniela' | 'calendario';

const countryFlagCodes: Record<string, string> = {
  Mexico: 'mx',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Czech Republic': 'cz',
  Canada: 'ca',
  'Bosnia and Herzegovina': 'ba',
  Qatar: 'qa',
  Switzerland: 'ch',
  Brazil: 'br',
  Morocco: 'ma',
  Haiti: 'ht',
  Scotland: 'gb',
  'United States': 'us',
  Paraguay: 'py',
  Australia: 'au',
  Turkey: 'tr',
  Germany: 'de',
  Curacao: 'cw',
  'Ivory Coast': 'ci',
  Ecuador: 'ec',
  Netherlands: 'nl',
  Japan: 'jp',
  Sweden: 'se',
  Tunisia: 'tn',
  Belgium: 'be',
  Egypt: 'eg',
  Iran: 'ir',
  'New Zealand': 'nz',
  Spain: 'es',
  'Cape Verde': 'cv',
  'Saudi Arabia': 'sa',
  Uruguay: 'uy',
  France: 'fr',
  Senegal: 'sn',
  Iraq: 'iq',
  Norway: 'no',
  Argentina: 'ar',
  Algeria: 'dz',
  Austria: 'at',
  Jordan: 'jo',
  Portugal: 'pt',
  'DR Congo': 'cd',
  Uzbekistan: 'uz',
  Colombia: 'co',
  England: 'gb',
  Croatia: 'hr',
  Ghana: 'gh',
  Panama: 'pa',
  'Costa Rica': 'cr',
};

const flagCatalog = Object.entries(countryFlagCodes).map(([country, code]) => ({
  country,
  url: `https://flagcdn.com/w80/${code}.png`,
}));

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-CR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function AdminPage() {
  const { me, loading } = useMe();

  const [tab, setTab] = useState<AdminTab>('quiniela');
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [newLeagueName, setNewLeagueName] = useState('Nueva Quiniela');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');

  const [finalHome, setFinalHome] = useState<Record<string, string>>({});
  const [finalAway, setFinalAway] = useState<Record<string, string>>({});

  const [syncSeason, setSyncSeason] = useState('2026');
  const [syncExternalLeagueId, setSyncExternalLeagueId] = useState('1');
  const [syncFrom, setSyncFrom] = useState('');
  const [syncTo, setSyncTo] = useState('');

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamImages, setTeamImages] = useState<string[]>([]);
  const [flagSearch, setFlagSearch] = useState('');
  const [teamIdEditing, setTeamIdEditing] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');

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
    if (!currentLeagueId) {
      setMatches([]);
      return;
    }
    const r = await apiFetch<{ matches: Match[] }>(`/leagues/${currentLeagueId}/matches`);
    setMatches(r.matches);
  }

  async function loadTeams() {
    if (!leagueId) {
      setTeams([]);
      return;
    }
    const r = await apiFetch<{ teams: AdminTeam[] }>(`/admin/teams?leagueId=${leagueId}`);
    setTeams(r.teams);
  }

  async function loadTeamImages() {
    const r = await apiFetch<{ images: string[] }>('/admin/team-images');
    setTeamImages(r.images);
  }

  async function createLeague() {
    if (!newLeagueName.trim()) throw new Error('Nombre de quiniela obligatorio');

    await apiFetch('/leagues', {
      method: 'POST',
      body: JSON.stringify({
        name: newLeagueName.trim(),
        description: newLeagueDescription.trim() || undefined,
      }),
    });

    await loadCore();
    setMsg('Quiniela creada correctamente.');
  }

  function resetTeamForm() {
    setTeamIdEditing(null);
    setTeamName('');
    setTeamCode('');
    setTeamLogoUrl('');
  }

  async function saveTeam() {
    setMsg(null);
    if (!leagueId) throw new Error('Selecciona una quiniela');
    if (!teamName.trim()) throw new Error('Nombre de equipo obligatorio');
    if (!teamLogoUrl.trim()) throw new Error('Debes subir o seleccionar una foto de equipo');

    const payload = {
      leagueId,
      name: teamName,
      code: teamCode || null,
      logoUrl: teamLogoUrl,
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

  async function runSync() {
    if (!leagueId) {
      setMsg('Selecciona una quiniela para sincronizar calendario.');
      return;
    }

    setMsg(null);
    const season = Number(syncSeason || '2026');
    const externalLeagueId = Number(syncExternalLeagueId || '1');
    const body: Record<string, unknown> = { season, externalLeagueId };
    if (syncFrom) body.from = syncFrom;
    if (syncTo) body.to = syncTo;

    const result = await apiFetch<{ sync: { created: number; updated: number } }>(`/leagues/${leagueId}/sync/fixtures`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setMsg(`Sync calendario ok. Creados: ${result.sync.created}, actualizados: ${result.sync.updated}.`);
    await loadMatches(leagueId);
  }

  useEffect(() => {
    if (!me || me.role !== 'SUPERADMIN') return;
    (async () => {
      try {
        await loadCore();
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar admin');
      }
    })();
  }, [me?.id, me?.role]);

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
    if (tab !== 'quiniela') return;
    if (!leagueId) return;
    (async () => {
      try {
        await Promise.all([loadTeams(), loadTeamImages()]);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar equipos');
      }
    })();
  }, [tab, leagueId]);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === leagueId) ?? null,
    [leagues, leagueId]
  );

  const filteredFlags = useMemo(() => {
    const query = flagSearch.trim().toLowerCase();
    if (!query) return flagCatalog;
    return flagCatalog.filter((item) => item.country.toLowerCase().includes(query));
  }, [flagSearch]);

  if (loading) {
    return (
      <>
        <Nav />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Admin</h2>
          <p className="small">Cargando...</p>
        </div>
      </>
    );
  }

  if (!me || me.role !== 'SUPERADMIN') {
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
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Panel Admin</h1>
        <p className="small" style={{ marginTop: 0 }}>
          Gestion de quinielas, usuarios y calendario Mundial 2026.
        </p>

        {msg && (
          <div className="card">
            <p className="small" style={{ margin: 0 }}>{msg}</p>
          </div>
        )}

        <div className="admin-tabs">
          <button className={`btn ${tab === 'quiniela' ? 'primary' : ''}`} onClick={() => setTab('quiniela')}>Quiniela</button>
          <button className={`btn ${tab === 'calendario' ? 'primary' : ''}`} onClick={() => setTab('calendario')}>Calendario</button>
        </div>

        {tab === 'quiniela' && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Modulo Quiniela</h2>

            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Crear quiniela</h3>
                <div className="label">Nombre</div>
                <input className="input" value={newLeagueName} onChange={(e) => setNewLeagueName(e.target.value)} />

                <div className="label">Descripcion</div>
                <input className="input" value={newLeagueDescription} onChange={(e) => setNewLeagueDescription(e.target.value)} placeholder="Descripcion opcional" />

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={async () => {
                    try {
                      await createLeague();
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo crear quiniela');
                    }
                  }}>Crear quiniela</button>
                </div>
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Ligas y control</h3>
                <div className="label">Liga activa</div>
                <select className="input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
                  {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                </select>

                {selectedLeague && (
                  <div style={{ marginTop: 12 }} className="small">
                    <div><b>Codigo:</b> {selectedLeague.joinCode}</div>
                    <div><b>Creador:</b> {selectedLeague.createdBy.fullName?.trim() || `@${selectedLeague.createdBy.username}`}</div>
                    <div><b>Descripcion:</b> {selectedLeague.description || '-'}</div>
                    <div><b>Miembros:</b> {selectedLeague._count.members}</div>
                    <div><b>Partidos:</b> {selectedLeague._count.matches}</div>
                    <div><b>Pronosticos:</b> {selectedLeague._count.predictions}</div>
                  </div>
                )}

                {leagueId && (
                  <div className="row-actions" style={{ marginTop: 12 }}>
                    <Link className="btn" href={`/leagues/${leagueId}`}>Abrir quiniela</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Usuarios registrados</h3>
              <table className="table">
                <thead>
                  <tr><th>Usuario</th><th>Cedula</th><th>Nacimiento</th><th>Instagram</th><th>Factura</th><th>Rol</th><th>Quinielas</th><th>Pronosticos</th></tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <b>{user.fullName?.trim() || `@${user.username}`}</b>
                        <br />
                        <span className="small">{user.email}</span>
                      </td>
                      <td>{user.nationalId || '-'}</td>
                      <td>{formatDate(user.birthDate)}</td>
                      <td>
                        {user.followsInstagram
                          ? user.instagramUsername
                            ? `Si (@${user.instagramUsername})`
                            : 'Si'
                          : 'No'}
                      </td>
                      <td>
                        {user.purchaseProofImage ? (
                          <a href={user.purchaseProofImage} target="_blank" rel="noreferrer" className="btn">Ver</a>
                        ) : '-'}
                      </td>
                      <td>{user.role}</td>
                      <td>{user._count.createdLeagues} / {user._count.leagues}</td>
                      <td>{user._count.predictions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Gestion de equipos y banderas</h3>
                <p className="small">Cada quiniela tiene equipos propios. La foto es obligatoria.</p>

                <div className="label">Quiniela</div>
                <select className="input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
                  {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                </select>

                <div className="label">Nombre</div>
                <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ej: Costa Rica" />

                <div className="grid cols2">
                  <div>
                    <div className="label">Codigo</div>
                    <input className="input" value={teamCode} onChange={(e) => setTeamCode(e.target.value.toUpperCase())} placeholder="CRC" />
                  </div>
                  <div>
                    <div className="label">Foto (URL o archivo)</div>
                    <input className="input" value={teamLogoUrl} onChange={(e) => setTeamLogoUrl(e.target.value)} placeholder="https://..." />
                    <input
                      className="input"
                      style={{ marginTop: 8 }}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await fileToDataUrl(file);
                          setTeamLogoUrl(dataUrl);
                        } catch (error: any) {
                          setMsg(error?.message ?? 'No se pudo leer la imagen');
                        }
                      }}
                    />
                  </div>
                </div>

                {teamLogoUrl && (
                  <div style={{ marginTop: 12 }}>
                    <div className="small" style={{ marginBottom: 8 }}>Vista previa</div>
                    <img src={teamLogoUrl} alt="Vista previa" className="team-logo-preview" />
                  </div>
                )}

                {!!teamImages.length && (
                  <div style={{ marginTop: 12 }}>
                    <div className="small" style={{ marginBottom: 8 }}>Fotos cargadas previamente</div>
                    <div className="image-library">
                      {teamImages.map((image) => (
                        <button
                          key={image}
                          type="button"
                          className={`image-pick ${teamLogoUrl === image ? 'active' : ''}`}
                          onClick={() => setTeamLogoUrl(image)}
                        >
                          <img src={image} alt="Logo sugerido" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <div className="small" style={{ marginBottom: 8 }}>Banderas por pais (buscable)</div>
                  <input
                    className="input"
                    placeholder="Buscar pais, ej: Argentina"
                    value={flagSearch}
                    onChange={(e) => setFlagSearch(e.target.value)}
                  />
                  <div className="image-library" style={{ marginTop: 8 }}>
                    {filteredFlags.map((item) => (
                      <button
                        key={item.country}
                        type="button"
                        className={`image-pick image-pick-country ${teamLogoUrl === item.url ? 'active' : ''}`}
                        onClick={() => setTeamLogoUrl(item.url)}
                        title={`Usar bandera de ${item.country}`}
                      >
                        <img src={item.url} alt={item.country} />
                        <span>{item.country}</span>
                      </button>
                    ))}
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

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Catalogo de equipos de la quiniela</h3>
                {!teams.length ? (
                  <p className="small" style={{ margin: 0 }}>No hay equipos cargados para esta quiniela.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr><th>Nombre</th><th>Codigo</th><th>Logo</th><th></th></tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => (
                        <tr key={team.id}>
                          <td>{team.name}</td>
                          <td>{team.code || '-'}</td>
                          <td>{team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="team-logo-thumb" /> : <span className="small">-</span>}</td>
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
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Resultados de partidos</h3>
              {!matches.length ? (
                <p className="small" style={{ margin: 0 }}>No hay partidos cargados para esta quiniela.</p>
              ) : (
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
              )}
            </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Modulo Calendario Mundial 2026</h2>

            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Sync de fixtures</h3>
                <p className="small">Sincroniza partidos reales para la quiniela seleccionada.</p>

                <div className="label">Quiniela destino</div>
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}
