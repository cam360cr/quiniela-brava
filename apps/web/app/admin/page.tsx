'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Nav from '../../components/Nav';
import { apiFetch } from '../../lib/api';
import { flagCatalog, normalizeSearchText, toSpanishTeamName } from '../../lib/teamNames';
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

type BulkDeleteResponse = {
  summary: {
    requested: number;
    deleted: number;
    skipped: number;
  };
  errors?: Array<{
    id: string;
    message: string;
  }>;
  missingIds?: string[];
};

type ResetLeagueDataResponse = {
  ok: boolean;
  deleted: {
    leagues: number;
    teams: number;
    matches: number;
    predictions: number;
    members: number;
  };
  usersPreserved: boolean;
};

type CsvImportResponse = {
  summary: {
    rowsReceived: number;
    createdTeams: number;
    updatedTeams: number;
    createdMatches: number;
    updatedMatches: number;
    unchangedMatches: number;
    errorRows: number;
  };
  errors: Array<{
    row: number;
    message: string;
  }>;
};

type QuinielaSection = 'sistema' | 'usuarios' | 'miembros' | 'equipos' | 'partidos';

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

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo CSV'));
    reader.readAsText(file);
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
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [showStoredTeamImages, setShowStoredTeamImages] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<{ src: string; userLabel: string } | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [bulkDeletingUsers, setBulkDeletingUsers] = useState(false);
  const [bulkDeletingTeams, setBulkDeletingTeams] = useState(false);
  const [bulkDeletingMatches, setBulkDeletingMatches] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);
  const [resettingLeagueData, setResettingLeagueData] = useState(false);
  const [showLeagueEditor, setShowLeagueEditor] = useState(false);

  function openInvoicePreview(src: string, userLabel: string) {
    setInvoicePreview({ src, userLabel });
  }

  function toggleSelection(setter: (updater: (current: string[]) => string[]) => void, id: string) {
    setter((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
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

  async function resetLeagueData() {
    if (resettingLeagueData) return;

    const confirmed = window.confirm(
      'Esto borrara TODAS las quinielas, equipos, partidos, miembros y pronosticos. Los usuarios registrados se conservan. Deseas continuar?'
    );
    if (!confirmed) return;

    setMsg(null);
    setResettingLeagueData(true);

    try {
      const response = await apiFetch<ResetLeagueDataResponse>('/admin/reset-league-data', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await loadCore();
      setLeagueMembers([]);
      setMatches([]);
      setTeams([]);
      setTeamImages([]);
      setSelectedTeamIds([]);
      setSelectedMatchIds([]);
      resetTeamForm();

      setMsg(
        `Limpieza completada: ${response.deleted.leagues} quinielas, ${response.deleted.teams} equipos y ${response.deleted.matches} partidos eliminados. Usuarios conservados.`
      );
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo limpiar la base de quinielas');
    } finally {
      setResettingLeagueData(false);
    }
  }

  function resetTeamForm() {
    setTeamIdEditing(null);
    setTeamName('');
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

  async function importMatchesFromCsv() {
    if (importingCsv) return;
    if (!leagueId) throw new Error('Selecciona una quiniela');

    setMsg(null);
    setImportingCsv(true);

    try {
      const content = csvContent.trim();
      if (!content) throw new Error('Debes cargar o pegar el contenido CSV');

      const response = await apiFetch<CsvImportResponse>(`/leagues/${leagueId}/matches/import-csv`, {
        method: 'POST',
        body: JSON.stringify({ csvContent: content }),
      });

      await Promise.all([loadMatches(leagueId), loadTeams(), loadCore()]);

      const previewErrors = response.errors
        .slice(0, 3)
        .map((item) => `fila ${item.row}: ${item.message}`)
        .join(' | ');

      let message =
        `Importacion lista: ${response.summary.createdMatches} partidos nuevos, ` +
        `${response.summary.updatedMatches} actualizados, ` +
        `${response.summary.createdTeams} equipos nuevos.`;

      if (response.summary.errorRows > 0) {
        message += ` Filas con error: ${response.summary.errorRows}.`;
      }

      if (previewErrors) {
        message += ` Ejemplos: ${previewErrors}`;
      }

      setMsg(message);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo importar el CSV');
    } finally {
      setImportingCsv(false);
    }
  }

  async function bulkDeleteUsers() {
    if (bulkDeletingUsers || selectedUserIds.length === 0) return;

    const confirmed = window.confirm(`Deseas eliminar ${selectedUserIds.length} usuarios seleccionados?`);
    if (!confirmed) return;

    setMsg(null);
    setBulkDeletingUsers(true);

    try {
      const response = await apiFetch<BulkDeleteResponse>('/admin/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedUserIds }),
      });

      await loadCore();
      setSelectedUserIds([]);

      const sampleErrors = (response.errors || [])
        .slice(0, 2)
        .map((item) => `${item.id}: ${item.message}`)
        .join(' | ');

      let summary = `Usuarios eliminados: ${response.summary.deleted}/${response.summary.requested}.`;
      if (response.summary.skipped > 0) {
        summary += ` Omitidos: ${response.summary.skipped}.`;
      }
      if (sampleErrors) {
        summary += ` Ejemplos: ${sampleErrors}`;
      }

      setMsg(summary);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo eliminar usuarios masivamente');
    } finally {
      setBulkDeletingUsers(false);
    }
  }

  async function bulkDeleteTeams() {
    if (bulkDeletingTeams || selectedTeamIds.length === 0) return;
    if (!leagueId) throw new Error('Selecciona una quiniela');

    const confirmed = window.confirm(`Deseas eliminar ${selectedTeamIds.length} equipos seleccionados?`);
    if (!confirmed) return;

    setMsg(null);
    setBulkDeletingTeams(true);

    try {
      const response = await apiFetch<BulkDeleteResponse>('/admin/teams/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          leagueId,
          ids: selectedTeamIds,
        }),
      });

      if (teamIdEditing && selectedTeamIds.includes(teamIdEditing)) {
        resetTeamForm();
      }

      await Promise.all([loadTeams(), loadTeamImages()]);
      setSelectedTeamIds([]);

      const sampleErrors = (response.errors || [])
        .slice(0, 2)
        .map((item) => `${item.id}: ${item.message}`)
        .join(' | ');

      let summary = `Equipos eliminados: ${response.summary.deleted}/${response.summary.requested}.`;
      if (response.summary.skipped > 0) {
        summary += ` Omitidos: ${response.summary.skipped}.`;
      }
      if (sampleErrors) {
        summary += ` Ejemplos: ${sampleErrors}`;
      }

      setMsg(summary);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo eliminar equipos masivamente');
    } finally {
      setBulkDeletingTeams(false);
    }
  }

  async function bulkDeleteMatches() {
    if (bulkDeletingMatches || selectedMatchIds.length === 0) return;
    if (!leagueId) throw new Error('Selecciona una quiniela');

    const confirmed = window.confirm(`Deseas eliminar ${selectedMatchIds.length} partidos seleccionados?`);
    if (!confirmed) return;

    setMsg(null);
    setBulkDeletingMatches(true);

    try {
      const response = await apiFetch<BulkDeleteResponse>(`/leagues/${leagueId}/matches/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: selectedMatchIds }),
      });

      await Promise.all([loadMatches(leagueId), loadCore()]);
      setSelectedMatchIds([]);

      const sampleMissing = (response.missingIds || []).slice(0, 3).join(', ');

      let summary = `Partidos eliminados: ${response.summary.deleted}/${response.summary.requested}.`;
      if (response.summary.skipped > 0) {
        summary += ` Omitidos: ${response.summary.skipped}.`;
      }
      if (sampleMissing) {
        summary += ` No encontrados: ${sampleMissing}`;
      }

      setMsg(summary);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo eliminar partidos masivamente');
    } finally {
      setBulkDeletingMatches(false);
    }
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
    setSelectedUserIds((current) => current.filter((id) => users.some((user) => user.id === id)));
  }, [users]);

  useEffect(() => {
    setSelectedTeamIds((current) => current.filter((id) => teams.some((team) => team.id === id)));
  }, [teams]);

  useEffect(() => {
    setSelectedMatchIds((current) => current.filter((id) => matches.some((match) => match.id === id)));
  }, [matches]);

  useEffect(() => {
    setSelectedTeamIds([]);
    setSelectedMatchIds([]);
    setCsvContent('');
    setCsvFileName('');
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

  const isLeagueSection = quinielaSection === 'miembros' || quinielaSection === 'equipos' || quinielaSection === 'partidos';

  function openLeagueEditor() {
    if (!leagueId) {
      setMsg('Selecciona una quiniela primero');
      return;
    }

    setShowLeagueEditor(true);
    if (!isLeagueSection) setQuinielaSection('miembros');
  }

  function closeLeagueEditor() {
    setShowLeagueEditor(false);
    if (isLeagueSection) setQuinielaSection('sistema');
  }

  const filteredFlags = useMemo(() => {
    const query = normalizeSearchText(flagSearch);
    if (!query) return flagCatalog;
    return flagCatalog.filter((item) => normalizeSearchText(`${item.name} ${item.spanishName}`).includes(query));
  }, [flagSearch]);

  const renderSystemUsersCard = () => (
    <div className="card">
      <div className="row-actions" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Usuarios del sistema ({users.length})</h3>
        {!!users.length && (
          <div className="row-actions">
            <button
              className="btn"
              disabled={bulkDeletingUsers || selectedUserIds.length === 0}
              onClick={bulkDeleteUsers}
            >
              {bulkDeletingUsers ? 'Eliminando...' : `Eliminar seleccionados (${selectedUserIds.length})`}
            </button>
          </div>
        )}
      </div>
      {!users.length ? (
        <p className="small" style={{ margin: 0 }}>No hay usuarios registrados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>
                <input
                  type="checkbox"
                  checked={users.filter((user) => user.role !== 'SUPERADMIN' && user.id !== me?.id).length > 0 && users
                    .filter((user) => user.role !== 'SUPERADMIN' && user.id !== me?.id)
                    .every((user) => selectedUserIds.includes(user.id))}
                  onChange={(e) => {
                    const selectableIds = users
                      .filter((user) => user.role !== 'SUPERADMIN' && user.id !== me?.id)
                      .map((user) => user.id);
                    setSelectedUserIds(e.target.checked ? selectableIds : []);
                  }}
                />
              </th>
              <th>Usuario</th><th>Rol</th><th>Quinielas</th><th>Pronosticos</th><th>Factura</th><th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.role === 'SUPERADMIN' || user.id === me?.id ? (
                    <span className="small">-</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleSelection(setSelectedUserIds, user.id)}
                    />
                  )}
                </td>
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
  );

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

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Administracion global</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Estas acciones aplican a todo el sistema y no dependen de la quiniela seleccionada.
          </p>

          <div className="admin-subtabs">
            <button
              className={`btn admin-subtab-btn ${quinielaSection === 'sistema' ? 'primary' : ''}`}
              onClick={() => {
                setQuinielaSection('sistema');
                setShowLeagueEditor(false);
              }}
            >
              Sistema global
            </button>
            <button
              className={`btn admin-subtab-btn ${quinielaSection === 'usuarios' ? 'primary' : ''}`}
              onClick={() => {
                setQuinielaSection('usuarios');
                setShowLeagueEditor(false);
              }}
            >
              Usuarios sistema
            </button>
          </div>

          <div className="row-actions" style={{ marginTop: 12 }}>
            <button className="btn" onClick={showLeagueEditor ? closeLeagueEditor : openLeagueEditor}>
              {showLeagueEditor ? 'Ocultar quiniela activa' : 'Editar quiniela activa'}
            </button>
          </div>
        </div>

        {showLeagueEditor && (
          <>
            <div className="card admin-active-league">
              <h2 style={{ marginTop: 0 }}>Quiniela activa</h2>
              <p className="small" style={{ marginTop: 0 }}>
                Estas herramientas dependen de la quiniela seleccionada aqui.
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
                  <button className="btn admin-equal-btn" onClick={closeLeagueEditor}>
                    Ocultar editor de quiniela
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Herramientas de quiniela activa</h3>
              <p className="small" style={{ marginTop: 0 }}>
                Gestiona miembros, equipos y partidos solo para la quiniela seleccionada.
              </p>

              <div className="admin-subtabs admin-subtabs-grid admin-subtabs-league-grid">
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
            </div>
          </>
        )}

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

              <div className="card admin-quick-actions" style={{ marginTop: 0 }}>
                <h3 style={{ marginTop: 0 }}>Limpiar base de quinielas</h3>
                <p className="small" style={{ marginTop: 0 }}>
                  Elimina todas las quinielas, equipos, partidos, miembros y pronosticos.
                  Los usuarios registrados se mantienen.
                </p>

                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    style={{ width: '100%' }}
                    disabled={resettingLeagueData}
                    onClick={resetLeagueData}
                  >
                    {resettingLeagueData ? 'Limpiando...' : 'Borrar datos de quinielas'}
                  </button>
                </div>
              </div>

            </div>
          </>
        )}

        {quinielaSection === 'usuarios' && renderSystemUsersCard()}

        {showLeagueEditor && quinielaSection === 'miembros' && (
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

        {showLeagueEditor && quinielaSection === 'equipos' && (
          <div className="grid cols2">
            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ marginTop: 0 }}>Equipos de esta quiniela</h3>
              <p className="small">Cada quiniela tiene equipos propios. La foto es obligatoria.</p>

              <div className="label">Nombre</div>
              <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ej: Costa Rica" />

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

              {teamLogoUrl && (
                <div style={{ marginTop: 12 }}>
                  <div className="small" style={{ marginBottom: 8 }}>Vista previa</div>
                  <img src={teamLogoUrl} alt="Vista previa" className="team-logo-preview" />
                </div>
              )}

              {!!teamImages.length && (
                <div style={{ marginTop: 12 }}>
                  <div className="row-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="small">Fotos cargadas previamente</div>
                    <button type="button" className="btn" onClick={() => setShowStoredTeamImages((value) => !value)}>
                      {showStoredTeamImages ? 'Ocultar' : `Mostrar (${teamImages.length})`}
                    </button>
                  </div>

                  {showStoredTeamImages && (
                    <div className="image-library" style={{ marginTop: 8 }}>
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
                  )}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <div className="small" style={{ marginBottom: 8 }}>Banderas por pais (buscable)</div>
                <input
                  className="input"
                  placeholder="Buscar pais, ej: Argentina o Alemania"
                  value={flagSearch}
                  onChange={(e) => setFlagSearch(e.target.value)}
                />
                <div className="image-library" style={{ marginTop: 8 }}>
                  {filteredFlags.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={`image-pick image-pick-country ${teamLogoUrl === item.url ? 'active' : ''}`}
                      onClick={() => setTeamLogoUrl(item.url)}
                      title={`Usar bandera de ${item.spanishName}`}
                    >
                      <img src={item.url} alt={item.spanishName} />
                      <span>{item.spanishName}</span>
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
              <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Listado de equipos</h3>
                {!!teams.length && (
                  <button
                    className="btn"
                    disabled={bulkDeletingTeams || selectedTeamIds.length === 0}
                    onClick={async () => {
                      try {
                        await bulkDeleteTeams();
                      } catch (e: any) {
                        setMsg(e?.message ?? 'No se pudo eliminar equipos masivamente');
                      }
                    }}
                  >
                    {bulkDeletingTeams ? 'Eliminando...' : `Eliminar seleccionados (${selectedTeamIds.length})`}
                  </button>
                )}
              </div>
              <p className="small" style={{ marginTop: 8 }}>
                Si un equipo tiene partidos, primero borra esos partidos en la pestana Partidos y luego elimina el equipo.
              </p>
              {!teams.length ? (
                <p className="small" style={{ margin: 0 }}>No hay equipos cargados para esta quiniela.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>
                        <input
                          type="checkbox"
                          checked={teams.length > 0 && teams.every((team) => selectedTeamIds.includes(team.id))}
                          onChange={(e) => setSelectedTeamIds(e.target.checked ? teams.map((team) => team.id) : [])}
                        />
                      </th>
                      <th>Nombre</th><th>Acciones</th><th>Logo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={() => toggleSelection(setSelectedTeamIds, team.id)}
                          />
                        </td>
                        <td>{toSpanishTeamName(team.name)}</td>
                        <td>
                          <div className="row-actions admin-table-actions">
                            <button className="btn admin-equal-btn" onClick={() => {
                              setTeamIdEditing(team.id);
                              setTeamName(team.name);
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
                        <td>{team.logoUrl ? <img src={team.logoUrl} alt={toSpanishTeamName(team.name)} className="team-logo-thumb" /> : <span className="small">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {showLeagueEditor && quinielaSection === 'partidos' && (
          <div className="card">
            <div className="card" style={{ marginTop: 0, padding: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Importar partidos por CSV</h3>
              <p className="small" style={{ marginTop: 0 }}>
                Desde aqui puedes importar partidos y, si en el CSV vienen equipos nuevos, tambien se crean automaticamente.
              </p>

              <p className="small" style={{ marginTop: 0 }}>
                Columnas minimas: <b>homeTeam, awayTeam, kickoffAt</b>. Opcional: <b>lockAt, homeLogoUrl, awayLogoUrl</b>.
              </p>

              <div className="label">Archivo CSV</div>
              <input
                className="input"
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const text = await fileToText(file);
                    setCsvContent(text);
                    setCsvFileName(file.name);
                  } catch (error: any) {
                    setMsg(error?.message ?? 'No se pudo leer el archivo CSV');
                  }
                }}
              />

              {csvFileName && (
                <p className="small" style={{ marginTop: 8, marginBottom: 0 }}>
                  Archivo cargado: <b>{csvFileName}</b>
                </p>
              )}

              <div className="label">Contenido CSV (editable)</div>
              <textarea
                className="input"
                style={{ minHeight: 180, fontFamily: 'monospace' }}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={'homeTeam,awayTeam,kickoffAt\nMexico,South Africa,2026-06-11T10:00:00-06:00'}
              />

              <div className="row-actions" style={{ marginTop: 12 }}>
                <button className="btn primary" disabled={importingCsv} onClick={importMatchesFromCsv}>
                  {importingCsv ? 'Importando...' : 'Importar CSV a esta quiniela'}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setCsvContent('');
                    setCsvFileName('');
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="row-actions" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Partidos de esta quiniela</h3>
              {!!matches.length && (
                <button
                  className="btn"
                  disabled={bulkDeletingMatches || selectedMatchIds.length === 0}
                  onClick={async () => {
                    try {
                      await bulkDeleteMatches();
                    } catch (e: any) {
                      setMsg(e?.message ?? 'No se pudo eliminar partidos masivamente');
                    }
                  }}
                >
                  {bulkDeletingMatches ? 'Eliminando...' : `Eliminar seleccionados (${selectedMatchIds.length})`}
                </button>
              )}
            </div>
            {!!matches.length && (
              <div className="row-actions" style={{ marginTop: 8 }}>
                <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={matches.length > 0 && matches.every((match) => selectedMatchIds.includes(match.id))}
                    onChange={(e) => setSelectedMatchIds(e.target.checked ? matches.map((match) => match.id) : [])}
                  />
                  Seleccionar todos los partidos de esta quiniela
                </label>
              </div>
            )}
            {!matches.length ? (
              <p className="small" style={{ margin: 0 }}>No hay partidos cargados para esta quiniela.</p>
            ) : (
              <div className="admin-match-list">
                {matches.map((m, index) => {
                  const teamNameOptions = Array.from(new Set([m.homeTeam.name, m.awayTeam.name, ...teams.map((team) => team.name)]));
                  const currentResult = m.finalHome === null ? '-' : `${m.finalHome} - ${m.finalAway}`;
                  const homeName = toSpanishTeamName(editHomeTeam[m.id] ?? m.homeTeam.name);
                  const awayName = toSpanishTeamName(editAwayTeam[m.id] ?? m.awayTeam.name);

                  return (
                    <div className="card admin-match-card" key={m.id}>
                      <div className="admin-match-topline">
                        <div className="admin-match-title-wrap">
                          <span className="admin-match-index">Partido {index + 1}</span>
                          <h4 className="admin-match-title">{homeName} vs {awayName}</h4>
                        </div>

                        <div className="row-actions admin-match-current">
                          <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={selectedMatchIds.includes(m.id)}
                              onChange={() => toggleSelection(setSelectedMatchIds, m.id)}
                            />
                            Seleccionar
                          </label>
                          <span className="small admin-match-current-pill"><b>Actual:</b> {currentResult}</span>
                        </div>
                      </div>

                      <div className="admin-match-edit-grid">
                        <div>
                          <div className="small">Equipo local</div>
                          <select
                            className="input"
                            value={editHomeTeam[m.id] ?? m.homeTeam.name}
                            onChange={(e) => setEditHomeTeam((state) => ({ ...state, [m.id]: e.target.value }))}
                          >
                            {teamNameOptions.map((name) => <option key={`home-${m.id}-${name}`} value={name}>{toSpanishTeamName(name)}</option>)}
                          </select>
                        </div>

                        <div>
                          <div className="small">Equipo visitante</div>
                          <select
                            className="input"
                            value={editAwayTeam[m.id] ?? m.awayTeam.name}
                            onChange={(e) => setEditAwayTeam((state) => ({ ...state, [m.id]: e.target.value }))}
                          >
                            {teamNameOptions.map((name) => <option key={`away-${m.id}-${name}`} value={name}>{toSpanishTeamName(name)}</option>)}
                          </select>
                        </div>
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
                            <input
                              className="input"
                              value={finalHome[m.id] ?? ''}
                              onChange={(e) => setFinalHome((s) => ({ ...s, [m.id]: e.target.value }))}
                              placeholder="Local"
                              inputMode="numeric"
                            />
                            <input
                              className="input"
                              value={finalAway[m.id] ?? ''}
                              onChange={(e) => setFinalAway((s) => ({ ...s, [m.id]: e.target.value }))}
                              placeholder="Visitante"
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="admin-match-actions">
                        <button className="btn admin-match-action-btn" onClick={async () => {
                          setMsg(null);
                          try {
                            await updateMatch(m);
                          } catch (e: any) {
                            setMsg(e?.message ?? 'No se pudo actualizar partido');
                          }
                        }}>Guardar cambios</button>

                        <button className="btn green admin-match-action-btn" onClick={async () => {
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

                        <button className="btn admin-match-action-btn" onClick={async () => {
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
