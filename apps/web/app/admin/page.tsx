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

type LeagueMember = {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    fullName: string | null;
  };
};

type QuinielaSection = 'sistema' | 'miembros' | 'equipos' | 'partidos';

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

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function AdminPage() {
  const { me, loading } = useMe();

  const [quinielaSection, setQuinielaSection] = useState<QuinielaSection>('sistema');
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [leagueMembers, setLeagueMembers] = useState<LeagueMember[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [newLeagueName, setNewLeagueName] = useState('Nueva Quiniela');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');

  const [finalHome, setFinalHome] = useState<Record<string, string>>({});
  const [finalAway, setFinalAway] = useState<Record<string, string>>({});
  const [editHomeTeam, setEditHomeTeam] = useState<Record<string, string>>({});
  const [editAwayTeam, setEditAwayTeam] = useState<Record<string, string>>({});
  const [editKickoffAt, setEditKickoffAt] = useState<Record<string, string>>({});
  const [editLockAt, setEditLockAt] = useState<Record<string, string>>({});

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamImages, setTeamImages] = useState<string[]>([]);
  const [flagSearch, setFlagSearch] = useState('');
  const [teamIdEditing, setTeamIdEditing] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [invoicePreview, setInvoicePreview] = useState<{ src: string; userLabel: string } | null>(null);

  function openInvoicePreview(src: string, userLabel: string) {
    setInvoicePreview({ src, userLabel });
  }

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

  async function loadLeagueMembers(currentLeagueId: string) {
    if (!currentLeagueId) {
      setLeagueMembers([]);
      return;
    }

    const r = await apiFetch<{ league: { members: LeagueMember[] } }>(`/leagues/${currentLeagueId}`);
    setLeagueMembers(r.league.members);
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

  async function removeTeam(team: AdminTeam) {
    setMsg(null);
    if (!leagueId) throw new Error('Selecciona una quiniela');

    const confirmed = window.confirm(`Deseas eliminar realmente el equipo ${team.name}?`);
    if (!confirmed) return;

    await apiFetch(`/admin/teams/${team.id}`, { method: 'DELETE' });

    if (teamIdEditing === team.id) {
      resetTeamForm();
    }

    await Promise.all([loadTeams(), loadTeamImages()]);
    setMsg('Equipo eliminado.');
  }

  async function updateMatch(match: Match) {
    if (!leagueId) throw new Error('Selecciona una quiniela');

    const homeTeam = (editHomeTeam[match.id] ?? match.homeTeam.name).trim();
    const awayTeam = (editAwayTeam[match.id] ?? match.awayTeam.name).trim();
    const kickoffValue = editKickoffAt[match.id] ?? toDateTimeLocal(match.kickoffAt);
    const lockValue = editLockAt[match.id] ?? toDateTimeLocal(match.lockAt);

    if (!homeTeam || !awayTeam) throw new Error('Debes seleccionar ambos equipos');
    if (!kickoffValue) throw new Error('Kickoff invalido');
    if (!lockValue) throw new Error('Cierre invalido');

    const confirmed = window.confirm('Deseas cambiar realmente este partido?');
    if (!confirmed) return;

    await apiFetch(`/leagues/${leagueId}/matches/${match.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        homeTeam,
        awayTeam,
        kickoffAt: new Date(kickoffValue).toISOString(),
        lockAt: new Date(lockValue).toISOString(),
      }),
    });

    setMsg('Partido actualizado.');
    await loadMatches(leagueId);
  }

  async function removeMatch(match: Match) {
    if (!leagueId) throw new Error('Selecciona una quiniela');

    const confirmed = window.confirm(`Deseas eliminar realmente el partido ${match.homeTeam.name} vs ${match.awayTeam.name}?`);
    if (!confirmed) return;

    await apiFetch(`/leagues/${leagueId}/matches/${match.id}`, {
      method: 'DELETE',
    });

    setMsg('Partido eliminado.');
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
    if (!leagueId) return;
    (async () => {
      try {
        await Promise.all([loadTeams(), loadTeamImages()]);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar equipos');
      }
    })();
  }, [leagueId]);

  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      try {
        await loadLeagueMembers(leagueId);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudo cargar miembros de la quiniela');
      }
    })();
  }, [leagueId]);

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
          Gestion de quinielas, usuarios, equipos y partidos.
        </p>

        {msg && (
          <div className="card">
            <p className="small" style={{ margin: 0 }}>{msg}</p>
          </div>
        )}

        <div className="card admin-active-league">
          <h2 style={{ marginTop: 0 }}>Quiniela activa</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Todo este modulo se organiza segun la quiniela seleccionada aqui.
          </p>

          <div className="admin-active-league-grid">
            <div>
              <div className="label">Seleccionar quiniela</div>
              <select className="input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
                {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>

            <div className="small admin-active-league-meta">
              {selectedLeague ? (
                <>
                  <div><b>Codigo:</b> {selectedLeague.joinCode}</div>
                  <div><b>Creador:</b> {selectedLeague.createdBy.fullName?.trim() || `@${selectedLeague.createdBy.username}`}</div>
                  <div><b>Miembros:</b> {selectedLeague._count.members}</div>
                  <div><b>Partidos:</b> {selectedLeague._count.matches}</div>
                </>
              ) : (
                <div>Selecciona una quiniela para empezar.</div>
              )}
            </div>
          </div>

          <div className="admin-system-kpis">
            <div className="card admin-stat-card">
              <div className="small">Usuarios totales</div>
              <div className="admin-stat-value">{users.length}</div>
            </div>
            <div className="card admin-stat-card">
              <div className="small">Quinielas totales</div>
              <div className="admin-stat-value">{leagues.length}</div>
            </div>
            <div className="card admin-stat-card">
              <div className="small">Miembros en esta quiniela</div>
              <div className="admin-stat-value">{leagueMembers.length}</div>
            </div>
          </div>

          {leagueId && (
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Link className="btn admin-equal-btn" href={`/leagues/${leagueId}`}>Abrir quiniela</Link>
            </div>
          )}
        </div>

        <div className="admin-subtabs admin-subtabs-grid">
          <button className={`btn admin-subtab-btn ${quinielaSection === 'sistema' ? 'primary' : ''}`} onClick={() => setQuinielaSection('sistema')}>
            Sistema
          </button>
          <button className={`btn admin-subtab-btn ${quinielaSection === 'miembros' ? 'primary' : ''}`} onClick={() => setQuinielaSection('miembros')}>
            Miembros
          </button>
          <button className={`btn admin-subtab-btn ${quinielaSection === 'equipos' ? 'primary' : ''}`} onClick={() => setQuinielaSection('equipos')}>
            Equipos
          </button>
          <button className={`btn admin-subtab-btn ${quinielaSection === 'partidos' ? 'primary' : ''}`} onClick={() => setQuinielaSection('partidos')}>
            Partidos
          </button>
        </div>

        {quinielaSection === 'sistema' && (
          <>
            <div className="grid cols2">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Crear quiniela</h3>
                <div className="label">Nombre</div>
                <input className="input" value={newLeagueName} onChange={(e) => setNewLeagueName(e.target.value)} />

                <div className="label">Descripcion</div>
                <input className="input" value={newLeagueDescription} onChange={(e) => setNewLeagueDescription(e.target.value)} placeholder="Descripcion opcional" />

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button className="btn primary admin-equal-btn" onClick={async () => {
                    try {
                      await createLeague();
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo crear quiniela');
                    }
                  }}>Crear quiniela</button>
                </div>
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Resumen de quiniela activa</h3>
                {selectedLeague ? (
                  <div className="small">
                    <div><b>Nombre:</b> {selectedLeague.name}</div>
                    <div><b>Descripcion:</b> {selectedLeague.description || '-'}</div>
                    <div><b>Pronosticos:</b> {selectedLeague._count.predictions}</div>
                  </div>
                ) : (
                  <p className="small" style={{ margin: 0 }}>No hay quiniela seleccionada.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Usuarios del sistema ({users.length})</h3>
              {!users.length ? (
                <p className="small" style={{ margin: 0 }}>No hay usuarios registrados.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Usuario</th><th>Rol</th><th>Quinielas</th><th>Pronosticos</th><th>Factura</th><th>Accion</th></tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <b>{user.fullName?.trim() || `@${user.username}`}</b>
                          <br />
                          <span className="small">{user.email}</span>
                        </td>
                        <td>{user.role}</td>
                        <td>{user._count.leagues}</td>
                        <td>{user._count.predictions}</td>
                        <td>
                          {user.purchaseProofImage ? (
                            <button className="btn admin-equal-btn" onClick={() => openInvoicePreview(user.purchaseProofImage as string, user.username)}>Ver factura</button>
                          ) : 'No'}
                        </td>
                        <td>
                          <div className="row-actions admin-table-actions">
                            <Link className="btn admin-equal-btn" href={`/admin/users/${user.id}`}>Ver perfil</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {quinielaSection === 'miembros' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Usuarios de la quiniela activa</h3>
            <p className="small" style={{ marginTop: 0 }}>
              Aqui solo se muestran los miembros de la quiniela seleccionada.
            </p>

            {!leagueId ? (
              <p className="small" style={{ margin: 0 }}>Selecciona una quiniela para ver sus miembros.</p>
            ) : !leagueMembers.length ? (
              <p className="small" style={{ margin: 0 }}>Esta quiniela aun no tiene miembros.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Usuario</th><th>Rol</th><th>Ingreso</th><th>Accion</th></tr>
                </thead>
                <tbody>
                  {leagueMembers.map((member) => (
                    <tr key={`${member.user.id}-${member.joinedAt}`}>
                      <td>{member.user.fullName?.trim() || `@${member.user.username}`}</td>
                      <td>{member.role}</td>
                      <td>{formatDate(member.joinedAt)}</td>
                      <td>
                        <div className="row-actions admin-table-actions">
                          <Link className="btn admin-equal-btn" href={`/admin/users/${member.user.id}`}>Ver perfil</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {quinielaSection === 'equipos' && (
          <div className="grid cols2">
            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ marginTop: 0 }}>Equipos de esta quiniela</h3>
              <p className="small">Cada quiniela tiene equipos propios. La foto es obligatoria.</p>

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
                <button className="btn primary admin-equal-btn" onClick={async () => {
                  try {
                    await saveTeam();
                  } catch (e: any) {
                    setMsg(e?.message ?? 'No se pudo guardar equipo');
                  }
                }}>{teamIdEditing ? 'Actualizar equipo' : 'Crear equipo'}</button>
                {teamIdEditing && <button className="btn admin-equal-btn" onClick={resetTeamForm}>Cancelar</button>}
              </div>
            </div>

            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ marginTop: 0 }}>Listado de equipos</h3>
              {!teams.length ? (
                <p className="small" style={{ margin: 0 }}>No hay equipos cargados para esta quiniela.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Nombre</th><th>Acciones</th><th>Codigo</th><th>Logo</th></tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>
                          <div className="row-actions admin-table-actions">
                            <button className="btn admin-equal-btn" onClick={() => {
                              setTeamIdEditing(team.id);
                              setTeamName(team.name);
                              setTeamCode(team.code || '');
                              setTeamLogoUrl(team.logoUrl || '');
                            }}>Editar</button>

                            <button className="btn admin-equal-btn" onClick={async () => {
                              try {
                                await removeTeam(team);
                              } catch (e: any) {
                                setMsg(e?.message ?? 'No se pudo eliminar equipo');
                              }
                            }}>Eliminar</button>
                          </div>
                        </td>
                        <td>{team.code || '-'}</td>
                        <td>{team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="team-logo-thumb" /> : <span className="small">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {quinielaSection === 'partidos' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Partidos de esta quiniela</h3>
            {!matches.length ? (
              <p className="small" style={{ margin: 0 }}>No hay partidos cargados para esta quiniela.</p>
            ) : (
              <div className="admin-match-list">
                {matches.map((m) => {
                  const teamNameOptions = Array.from(new Set([m.homeTeam.name, m.awayTeam.name, ...teams.map((team) => team.name)]));
                  const currentResult = m.finalHome === null ? '-' : `${m.finalHome} - ${m.finalAway}`;

                  return (
                    <div className="card admin-match-card" key={m.id}>
                      <div className="admin-match-head">
                        <div className="row-actions admin-match-teams">
                          <select
                            className="input"
                            value={editHomeTeam[m.id] ?? m.homeTeam.name}
                            onChange={(e) => setEditHomeTeam((state) => ({ ...state, [m.id]: e.target.value }))}
                          >
                            {teamNameOptions.map((name) => <option key={`home-${m.id}-${name}`} value={name}>{name}</option>)}
                          </select>
                          <span className="small">vs</span>
                          <select
                            className="input"
                            value={editAwayTeam[m.id] ?? m.awayTeam.name}
                            onChange={(e) => setEditAwayTeam((state) => ({ ...state, [m.id]: e.target.value }))}
                          >
                            {teamNameOptions.map((name) => <option key={`away-${m.id}-${name}`} value={name}>{name}</option>)}
                          </select>
                        </div>

                        <div className="small admin-match-current"><b>Actual:</b> {currentResult}</div>
                      </div>

                      <div className="admin-match-grid">
                        <div>
                          <div className="small">Kickoff</div>
                          <input
                            className="input"
                            type="datetime-local"
                            value={editKickoffAt[m.id] ?? toDateTimeLocal(m.kickoffAt)}
                            onChange={(e) => setEditKickoffAt((state) => ({ ...state, [m.id]: e.target.value }))}
                          />
                        </div>

                        <div>
                          <div className="small">Cierre</div>
                          <input
                            className="input"
                            type="datetime-local"
                            value={editLockAt[m.id] ?? toDateTimeLocal(m.lockAt)}
                            onChange={(e) => setEditLockAt((state) => ({ ...state, [m.id]: e.target.value }))}
                          />
                        </div>

                        <div>
                          <div className="small">Nuevo resultado</div>
                          <div className="row-actions admin-match-score">
                            <input className="input" value={finalHome[m.id] ?? ''} onChange={(e) => setFinalHome((s) => ({ ...s, [m.id]: e.target.value }))} />
                            <input className="input" value={finalAway[m.id] ?? ''} onChange={(e) => setFinalAway((s) => ({ ...s, [m.id]: e.target.value }))} />
                          </div>
                        </div>
                      </div>

                      <div className="row-actions admin-match-actions">
                        <button className="btn admin-equal-btn" onClick={async () => {
                          setMsg(null);
                          try {
                            await updateMatch(m);
                          } catch (e: any) {
                            setMsg(e?.message ?? 'No se pudo actualizar partido');
                          }
                        }}>Guardar cambios</button>

                        <button className="btn green admin-equal-btn" onClick={async () => {
                          setMsg(null);
                          try {
                            const confirmed = window.confirm('Deseas cambiar realmente este resultado?');
                            if (!confirmed) return;

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
                        }}>Guardar resultado</button>

                        <button className="btn admin-equal-btn" onClick={async () => {
                          setMsg(null);
                          try {
                            await removeMatch(m);
                          } catch (e: any) {
                            setMsg(e?.message ?? 'No se pudo eliminar partido');
                          }
                        }}>Eliminar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {invoicePreview && (
          <div className="admin-proof-modal-backdrop" onClick={() => setInvoicePreview(null)}>
            <div className="card admin-proof-modal" onClick={(e) => e.stopPropagation()}>
              <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Factura de @{invoicePreview.userLabel}</h3>
                <button className="btn" onClick={() => setInvoicePreview(null)}>Cerrar</button>
              </div>

              <div className="admin-proof-modal-body">
                <img
                  src={invoicePreview.src}
                  alt={`Factura de @${invoicePreview.userLabel}`}
                  className="admin-proof-image"
                />
              </div>

              <div className="row-actions" style={{ marginTop: 12 }}>
                <a className="btn" href={invoicePreview.src} download={`factura-${invoicePreview.userLabel}.jpg`}>Descargar</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
