'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '../../../components/Nav';
import { apiFetch } from '../../../lib/api';
import { useMe } from '../../../lib/hooks';

type MatchItem = {
  id: string;
  kickoffAt: string;
  lockAt: string;
  finalHome: number | null;
  finalAway: number | null;
  homeTeam: { name: string; logoUrl?: string | null };
  awayTeam: { name: string; logoUrl?: string | null };
  myPrediction: { predHome: number; predAway: number; points: number | null } | null;
};

type LeagueTeam = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
};

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

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('es-CR', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LeaguePage({ params }: { params: { id: string } }) {
  const leagueId = params.id;
  const { me, loading } = useMe();

  const [league, setLeague] = useState<any>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [predHome, setPredHome] = useState<Record<string, string>>({});
  const [predAway, setPredAway] = useState<Record<string, string>>({});
  const [resultHome, setResultHome] = useState<Record<string, string>>({});
  const [resultAway, setResultAway] = useState<Record<string, string>>({});

  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>([]);
  const [teamImages, setTeamImages] = useState<string[]>([]);
  const [flagSearch, setFlagSearch] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');

  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [kickoffAt, setKickoffAt] = useState('');

  async function load() {
    const r = await apiFetch<{ league: any; matches: MatchItem[]; canManage: boolean }>(`/leagues/${leagueId}/matches`);
    setLeague(r.league);
    setMatches(r.matches);
    setCanManage(r.canManage);

    const ph: Record<string, string> = {};
    const pa: Record<string, string> = {};
    const rh: Record<string, string> = {};
    const ra: Record<string, string> = {};

    r.matches.forEach((m) => {
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

  async function loadLeagueTeams() {
    const r = await apiFetch<{ teams: LeagueTeam[] }>(`/leagues/${leagueId}/teams`);
    setLeagueTeams(r.teams);
  }

  async function loadTeamImages() {
    const r = await apiFetch<{ images: string[] }>(`/leagues/${leagueId}/team-images`);
    setTeamImages(r.images);
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.readAsDataURL(file);
    });
  }

  const filteredFlags = useMemo(() => {
    const query = flagSearch.trim().toLowerCase();
    if (!query) return flagCatalog;
    return flagCatalog.filter((item) => item.country.toLowerCase().includes(query));
  }, [flagSearch]);

  useEffect(() => {
    if (!me) return;
    load().catch((e) => setMsg(e.message));
  }, [leagueId, me?.id]);

  useEffect(() => {
    if (!me) return;
    if (!canManage) return;
    Promise.all([loadLeagueTeams(), loadTeamImages()]).catch((e: any) => {
      setMsg(e?.message ?? 'No se pudieron cargar equipos o imagenes');
    });
  }, [canManage, leagueId, me?.id]);

  if (loading) {
    return (
      <>
        <Nav />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Quiniela</h2>
          <p className="small">Cargando...</p>
        </div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Nav />
        <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ marginTop: 0 }}>Inicia sesion para ver esta quiniela</h2>
          <p className="small">El calendario es publico, pero las quinielas son solo para usuarios registrados.</p>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <Link className="btn primary" href="/login">Entrar</Link>
            <Link className="btn" href="/register">Crear cuenta</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="card">
        <section className="qb-hero">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>{league?.name || 'Quiniela'}</h2>
            {league?.description && <div className="small">{league.description}</div>}
            <div className="small">Codigo para entrar: <b>{league?.joinCode}</b></div>
          </div>
          <div className="row-actions">
            <Link className="btn" href={`/leagues/${leagueId}/leaderboard`}>Ver ranking</Link>
            <Link className="btn" href="/leagues">Volver</Link>
          </div>
        </section>

        {msg && <div className="qb-alert">{msg}</div>}

        {canManage && (
          <details className="card qb-admin-panel">
            <summary>Panel admin: equipos y partidos</summary>

            <div className="card" style={{ marginTop: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>1) Agregar equipos</h3>
              <p className="small" style={{ marginTop: 0 }}>Primero crea los equipos de esta quiniela y asignales bandera/logo.</p>

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
                  <div className="small" style={{ marginBottom: 8 }}>Banderas/logos guardados</div>
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

              <div style={{ marginTop: 12 }} className="row-actions">
                <button
                  className="btn primary"
                  onClick={async () => {
                    setMsg(null);
                    try {
                      if (!teamName.trim()) throw new Error('Nombre de equipo obligatorio');
                      if (!teamLogoUrl.trim()) throw new Error('Debes seleccionar una bandera/logo');

                      await apiFetch(`/leagues/${leagueId}/teams`, {
                        method: 'POST',
                        body: JSON.stringify({
                          name: teamName,
                          code: teamCode || null,
                          logoUrl: teamLogoUrl,
                        }),
                      });

                      setTeamName('');
                      setTeamCode('');
                      setTeamLogoUrl('');
                      await Promise.all([loadLeagueTeams(), loadTeamImages()]);
                      setMsg('Equipo agregado a la quiniela.');
                    } catch (e: any) {
                      setMsg(e.message);
                    }
                  }}
                >
                  Agregar equipo
                </button>
              </div>
            </div>

            <div className="card" style={{ marginTop: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Lista de equipos de esta quiniela</h3>
              {!leagueTeams.length ? (
                <p className="small" style={{ margin: 0 }}>Todavia no hay equipos. Agrega al menos 2 para crear partidos.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Equipo</th><th>Codigo</th><th>Bandera/logo</th></tr>
                  </thead>
                  <tbody>
                    {leagueTeams.map((team) => (
                      <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>{team.code || '-'}</td>
                        <td>{team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="team-logo-thumb" /> : <span className="small">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ marginTop: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>2) Crear partido</h3>
              <p className="small" style={{ marginTop: 0 }}>Selecciona equipo 1 y equipo 2 de la lista que acabas de guardar.</p>

              <div className="grid cols2">
                <div>
                  <div className="label">Equipo local</div>
                  <select className="input" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                    <option value="">Selecciona equipo</option>
                    {leagueTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="label">Equipo visitante</div>
                  <select className="input" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                    <option value="">Selecciona equipo</option>
                    {leagueTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="label">Fecha y kickoff</div>
                  <input className="input" type="datetime-local" value={kickoffAt} onChange={(e) => setKickoffAt(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 12 }} className="row-actions">
                <button
                  className="btn primary"
                  onClick={async () => {
                    setMsg(null);
                    try {
                      if (!homeTeamId || !awayTeamId || !kickoffAt) throw new Error('Completa el partido');
                      if (homeTeamId === awayTeamId) throw new Error('Los equipos deben ser distintos');

                      const home = leagueTeams.find((team) => team.id === homeTeamId);
                      const away = leagueTeams.find((team) => team.id === awayTeamId);
                      if (!home || !away) throw new Error('Selecciona equipos validos');

                      await apiFetch(`/leagues/${leagueId}/matches`, {
                        method: 'POST',
                        body: JSON.stringify({
                          homeTeam: home.name,
                          awayTeam: away.name,
                          kickoffAt: new Date(kickoffAt).toISOString(),
                        }),
                      });

                      setHomeTeamId('');
                      setAwayTeamId('');
                      setKickoffAt('');
                      await load();
                      setMsg('Partido agregado.');
                    } catch (e: any) {
                      setMsg(e.message);
                    }
                  }}
                >
                  Agregar partido
                </button>
              </div>
            </div>
          </details>
        )}

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Mis partidos</h3>
          <p className="small">Completa tus pronosticos antes del cierre de cada partido.</p>

          {matches.length === 0 ? (
            <p className="small">Esta quiniela todavia no tiene partidos.</p>
          ) : (
            <div className="qb-match-list">
              {matches.map((m) => {
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
                  <article key={m.id} className="qb-match-row">
                    <div className="qb-teams">
                      <div className="qb-team">
                        {m.homeTeam.logoUrl ? (
                          <img
                            src={m.homeTeam.logoUrl}
                            alt={m.homeTeam.name}
                            className="team-logo-thumb"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="qb-team-name">{m.homeTeam.name}</span>
                      </div>
                      <span className="qb-vs">vs</span>
                      <div className="qb-team">
                        {m.awayTeam.logoUrl ? (
                          <img
                            src={m.awayTeam.logoUrl}
                            alt={m.awayTeam.name}
                            className="team-logo-thumb"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="qb-team-name">{m.awayTeam.name}</span>
                      </div>
                    </div>

                    <div className="qb-meta">
                      <div><span className="small">Fecha</span><b>{dateLabel(m.kickoffAt)}</b></div>
                      <div><span className="small">Kickoff</span><b>{timeLabel(m.kickoffAt)}</b></div>
                      <div><span className="small">Cierre</span><b>{dateLabel(m.lockAt)} {timeLabel(m.lockAt)}</b></div>
                    </div>

                    <div className="qb-block">
                      <div className="small">Pronostico</div>
                      <div className="row-actions">
                        <input
                          className={`input ${predictionSaved ? 'input-saved' : ''} ${predictionDirty ? 'input-dirty' : ''}`}
                          style={{ width: 72 }}
                          disabled={locked}
                          value={predHome[m.id] ?? ''}
                          onChange={(e) => setPredHome((s) => ({ ...s, [m.id]: e.target.value }))}
                        />
                        <input
                          className={`input ${predictionSaved ? 'input-saved' : ''} ${predictionDirty ? 'input-dirty' : ''}`}
                          style={{ width: 72 }}
                          disabled={locked}
                          value={predAway[m.id] ?? ''}
                          onChange={(e) => setPredAway((s) => ({ ...s, [m.id]: e.target.value }))}
                        />
                      </div>
                      {predictionSaved && <div className="small saved-note">Pronostico guardado</div>}
                      {!predictionSaved && predictionDirty && <div className="small dirty-note">Cambios sin guardar</div>}
                      <div className="row-actions qb-save-row" style={{ marginTop: 8 }}>
                        <button
                          className="btn primary"
                          disabled={locked}
                          onClick={async () => {
                            setMsg(null);
                            try {
                              const ph = parseScoreInput(predHome[m.id] ?? '', 'Pronostico local');
                              const pa = parseScoreInput(predAway[m.id] ?? '', 'Pronostico visitante');
                              await apiFetch(`/leagues/${leagueId}/predictions`, {
                                method: 'POST',
                                body: JSON.stringify({ matchId: m.id, predHome: ph, predAway: pa }),
                              });
                              await load();
                            } catch (e: any) {
                              setMsg(e.message);
                            }
                          }}
                        >
                          Guardar pronostico
                        </button>
                        {locked && <div className="small">Cerrado</div>}
                      </div>
                    </div>

                    <div className="qb-block">
                      <div className="small">Resultado final</div>
                      {canManage ? (
                        <div className="qb-result-editor">
                          <div className="row-actions">
                            <input
                              className={`input ${resultSaved ? 'input-saved' : ''} ${resultDirty ? 'input-dirty' : ''}`}
                              style={{ width: 72 }}
                              value={resultHome[m.id] ?? ''}
                              onChange={(e) => setResultHome((s) => ({ ...s, [m.id]: e.target.value }))}
                            />
                            <input
                              className={`input ${resultSaved ? 'input-saved' : ''} ${resultDirty ? 'input-dirty' : ''}`}
                              style={{ width: 72 }}
                              value={resultAway[m.id] ?? ''}
                              onChange={(e) => setResultAway((s) => ({ ...s, [m.id]: e.target.value }))}
                            />
                          </div>
                          <div className="row-actions qb-save-row" style={{ marginTop: 8 }}>
                            <button
                              className="btn green"
                              onClick={async () => {
                                setMsg(null);
                                try {
                                  const fh = parseScoreInput(resultHome[m.id] ?? '', 'Resultado local');
                                  const fa = parseScoreInput(resultAway[m.id] ?? '', 'Resultado visitante');
                                  await apiFetch(`/leagues/${leagueId}/matches/${m.id}/result`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ finalHome: fh, finalAway: fa }),
                                  });
                                  await load();
                                } catch (e: any) {
                                  setMsg(e.message);
                                }
                              }}
                            >
                              Guardar resultado
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="qb-result-pill">{m.finalHome === null ? '-' : `${m.finalHome} - ${m.finalAway}`}</div>
                      )}
                    </div>

                    <div className="qb-side">
                      <div className="small">Puntos</div>
                      <b>{m.myPrediction?.points ?? '-'}</b>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="small">Los puntos aparecen cuando el dueno de la quiniela carga resultados finales.</p>
        </section>
      </div>
    </>
  );
}
