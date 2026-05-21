'use client';

import { useEffect, useState } from 'react';
import Nav from '../../components/Nav';
import { apiFetch } from '../../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe } from '../../lib/hooks';

type League = { id: string; name: string; description?: string; joinCode: string };
type ActiveLeague = {
  id: string;
  name: string;
  description?: string;
  joinCode: string;
  isMember: boolean;
  createdBy: { id: string; username: string; fullName?: string | null };
  _count: { members: number; matches: number };
};

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [activeLeagues, setActiveLeagues] = useState<ActiveLeague[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState('Mi Quiniela');
  const [description, setDescription] = useState('');
  const { me, loading } = useMe();
  const router = useRouter();
  const isSuperadmin = me?.role === 'SUPERADMIN';
  const joinedLeagues = activeLeagues.filter((league) => league.isMember);
  const joinableLeagues = activeLeagues.filter((league) => !league.isMember);
  const membersCountByLeagueId = new Map(activeLeagues.map((league) => [league.id, league._count.members]));

  async function load() {
    const active = await apiFetch<{ leagues: ActiveLeague[] }>('/leagues/active');
    setActiveLeagues(active.leagues);

    if (isSuperadmin) {
      const mine = await apiFetch<{ leagues: League[] }>('/leagues/mine');
      setLeagues(mine.leagues);
      return;
    }

    setLeagues([]);
  }

  useEffect(() => {
    if (!me) return;
    load().catch((e: any) => setMsg(e.message));
  }, [me?.id, isSuperadmin]);

  if (loading) {
    return (
      <>
        <Nav />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Quinielas</h2>
          <p className="small">Cargando...</p>
        </div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Nav />
        <div className="card" style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ marginTop: 0 }}>Quinielas solo para usuarios registrados</h2>
          <p className="small">
            Para participar, debes crear una cuenta e iniciar sesion. El calendario Mundial 2026 sigue disponible para todos.
          </p>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <Link className="btn primary" href="/register">Crear cuenta</Link>
            <Link className="btn" href="/login">Entrar</Link>
            <Link className="btn" href="/mundial-2026">Ver calendario publico</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Zona de quinielas</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Aqui veras las quinielas donde ya participas y las que estan disponibles para unirte.
        </p>
        {msg && <div className="card">{msg}</div>}

        {isSuperadmin && (
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{marginTop:0}}>Crear quiniela</h3>
            <div className="label">Nombre</div>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />

            <div className="label">Descripción</div>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional" />

            <div style={{ marginTop: 12 }} className="row-actions">
              <button className="btn primary" onClick={async () => {
                setMsg(null);
                try {
                  const r = await apiFetch<{ league: any }>('/leagues', { method: 'POST', body: JSON.stringify({ name, description: description || undefined }) });
                  await load();
                  router.push(`/leagues/${r.league.id}`);
                } catch (e: any) {
                  setMsg(e.message);
                }
              }}>Crear</button>
            </div>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Quinielas donde ya participo</h3>
          {joinedLeagues.length === 0 ? (
            <p className="small">Todavia no te has unido a ninguna quiniela.</p>
          ) : (
            <table className="table qb-leagues-table">
              <colgroup>
                <col className="qb-col-league" />
                <col className="qb-col-description" />
                <col className="qb-col-code" />
                <col className="qb-col-members" />
                <col className="qb-col-action" />
              </colgroup>
              <thead><tr><th>Quiniela</th><th>Descripcion</th><th>Codigo</th><th>Participantes</th><th></th></tr></thead>
              <tbody>
                {joinedLeagues.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.description || '-'}</td>
                    <td className="qb-code-cell">{l.joinCode}</td>
                    <td>{l._count.members}</td>
                    <td>
                      <Link className="btn" href={`/leagues/${l.id}`}>Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Quinielas disponibles para unirme</h3>
          {joinableLeagues.length === 0 ? (
            <p className="small">No hay quinielas nuevas disponibles en este momento.</p>
          ) : (
            <table className="table qb-leagues-table">
              <colgroup>
                <col className="qb-col-league" />
                <col className="qb-col-description" />
                <col className="qb-col-code" />
                <col className="qb-col-members" />
                <col className="qb-col-action" />
              </colgroup>
              <thead><tr><th>Quiniela</th><th>Descripcion</th><th>Codigo</th><th>Participantes</th><th></th></tr></thead>
              <tbody>
                {joinableLeagues.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.description || '-'}</td>
                    <td className="qb-code-cell">{l.joinCode}</td>
                    <td>{l._count.members}</td>
                    <td>
                      <button className="btn" onClick={async () => {
                        setMsg(null);
                        try {
                          await apiFetch<{ leagueId: string }>('/leagues/join', { method: 'POST', body: JSON.stringify({ joinCode: l.joinCode }) });
                          await load();
                        } catch (e: any) {
                          setMsg(e.message);
                        }
                      }}>Unirme</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isSuperadmin && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Quinielas creadas por admin</h3>
            {leagues.length === 0 ? (
              <p className="small">No has creado quinielas aun.</p>
            ) : (
              <table className="table qb-leagues-table">
                <colgroup>
                  <col className="qb-col-league" />
                  <col className="qb-col-description" />
                  <col className="qb-col-code" />
                  <col className="qb-col-members" />
                  <col className="qb-col-action" />
                </colgroup>
                <thead><tr><th>Quiniela</th><th>Descripcion</th><th>Codigo</th><th>Participantes</th><th></th></tr></thead>
                <tbody>
                  {leagues.map((l) => (
                    <tr key={l.id}>
                      <td>{l.name}</td>
                      <td>{l.description || '-'}</td>
                      <td className="qb-code-cell">{l.joinCode}</td>
                      <td>{membersCountByLeagueId.get(l.id) ?? 0}</td>
                      <td><Link className="btn" href={`/leagues/${l.id}`}>Abrir</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
