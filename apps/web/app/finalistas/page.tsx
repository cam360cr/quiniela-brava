'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Nav from '../../components/Nav';
import { apiFetch } from '../../lib/api';
import { useMe } from '../../lib/hooks';

type Team = {
  id: string;
  name: string;
  code?: string | null;
  logoUrl?: string | null;
};

type FinalPickMe = {
  user?: { id: string; email: string; username: string };
  profile?: { fullName: string; nationalId: string; phone: string };
  pick?: {
    finalist1TeamId: string;
    finalist2TeamId: string;
    championTeamId: string;
  };
  season: number;
};

export default function FinalistasPage() {
  const { me, loading } = useMe();
  const [season, setSeason] = useState(2026);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [finalist1TeamId, setFinalist1TeamId] = useState('');
  const [finalist2TeamId, setFinalist2TeamId] = useState('');
  const [championTeamId, setChampionTeamId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;

    let mounted = true;

    (async () => {
      try {
        const [teamsRes, meRes] = await Promise.all([
          apiFetch<{ teams: Team[] }>('/final-picks/teams'),
          apiFetch<FinalPickMe>(`/final-picks/me?season=${season}`),
        ]);

        if (!mounted) return;
        setTeams(teamsRes.teams);

        setFullName(meRes.profile?.fullName ?? '');
        setNationalId(meRes.profile?.nationalId ?? '');
        setPhone(meRes.profile?.phone ?? '');
        setFinalist1TeamId(meRes.pick?.finalist1TeamId ?? '');
        setFinalist2TeamId(meRes.pick?.finalist2TeamId ?? '');
        setChampionTeamId(meRes.pick?.championTeamId ?? '');
      } catch (error: any) {
        if (!mounted) return;
        setMsg(error?.message ?? 'No se pudo cargar la landing de finalistas');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [me, season]);

  const championOptions = useMemo(() => {
    return teams.filter((t) => t.id === finalist1TeamId || t.id === finalist2TeamId);
  }, [teams, finalist1TeamId, finalist2TeamId]);

  useEffect(() => {
    if (!championTeamId) return;
    const stillValid = championOptions.some((t) => t.id === championTeamId);
    if (!stillValid) setChampionTeamId('');
  }, [championOptions, championTeamId]);

  async function savePick() {
    setMsg(null);
    setSaving(true);
    try {
      await apiFetch('/final-picks/me', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          nationalId,
          phone,
          season,
          finalist1TeamId,
          finalist2TeamId,
          championTeamId,
        }),
      });
      setMsg('Guardado! Tu eleccion de finalistas y campeon quedo registrada.');
    } catch (error: any) {
      setMsg(error?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Nav />

      <section className="card landing-hero">
        <p className="wc-kicker">Landing oficial</p>
        <h1 style={{ marginTop: 8, marginBottom: 10 }}>Elige Finalistas y Campeon</h1>
        <p className="small" style={{ maxWidth: 880 }}>
          Esta experiencia usa la misma cuenta unica de quiniela. Completa tus datos y selecciona
          los dos equipos que llegan a la final y el campeon del torneo.
        </p>
      </section>

      {loading ? (
        <div className="card">
          <p className="small" style={{ margin: 0 }}>Cargando...</p>
        </div>
      ) : !me ? (
        <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ marginTop: 0 }}>Inicia sesion para participar</h2>
          <p className="small">
            Para mantener una cuenta unica en todo el sistema, esta landing requiere acceso con tu
            usuario de quiniela.
          </p>
          <div className="grid cols2">
            <Link className="btn primary" href="/login" style={{ textAlign: 'center', padding: '14px 18px' }}>
              Entrar
            </Link>
            <Link className="btn" href="/register" style={{ textAlign: 'center', padding: '14px 18px' }}>
              Crear cuenta
            </Link>
          </div>
        </div>
      ) : (
        <section className="card">
          <div className="row-actions" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Tu eleccion mundialista</h2>
            <span className="pill">Temporada {season}</span>
          </div>

          {msg && <p className="small" style={{ marginTop: 0 }}>{msg}</p>}

          <div className="pick-grid">
            <div>
              <div className="label">Correo</div>
              <input className="input readonly-input" value={me.email} readOnly />
            </div>

            <div>
              <div className="label">Nombre completo</div>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: Juan Perez Gonzalez" />
            </div>

            <div>
              <div className="label">Numero de cedula</div>
              <input className="input" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="Ej: 1-2345-6789" />
            </div>

            <div>
              <div className="label">Telefono</div>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +50688887777" />
            </div>

            <div>
              <div className="label">Finalista 1</div>
              <select className="input" value={finalist1TeamId} onChange={(e) => setFinalist1TeamId(e.target.value)}>
                <option value="">Selecciona equipo</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Finalista 2</div>
              <select className="input" value={finalist2TeamId} onChange={(e) => setFinalist2TeamId(e.target.value)}>
                <option value="">Selecciona equipo</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Campeon</div>
              <select className="input" value={championTeamId} onChange={(e) => setChampionTeamId(e.target.value)}>
                <option value="">Selecciona campeon</option>
                {championOptions.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row-actions" style={{ marginTop: 14 }}>
            <button
              className="btn primary"
              disabled={saving}
              onClick={savePick}
            >
              {saving ? 'Guardando...' : 'Guardar eleccion'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
