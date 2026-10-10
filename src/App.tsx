import React, { useState, useEffect, useMemo } from 'react';

interface Athlete {
  id: number;
  fullName: string;
  category: string;
  record1RmKg: number;
  active: boolean;
}

export const App: React.FC = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('Primera División');
  const [record1Rm, setRecord1Rm] = useState(80);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const busy = useMemo(() => loading || saving, [loading, saving]);

  async function request(path = '', options: RequestInit = {}) {
    let response: Response;
    try {
      response = await fetch(`/api/estructura/api/athletes${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error('No se pudo contactar con el servidor. Comprueba la conexión y vuelve a cargar.');
    }

    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      const details = problem?.errors ? Object.values(problem.errors).flat().join(' ') : null;
      throw new Error(details || problem?.detail || problem?.title || `El servidor respondió con error ${response.status}.`);
    }

    return response.status === 204 ? null : response.json();
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await request();
      setAthletes(data);
      setReady(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function mutate(action: () => Promise<void>) {
    if (busy) return;
    setSaving(true);
    setError('');
    try {
      await action();
    } catch (err: any) {
      setError(`${err.message} Si la respuesta se perdió, recarga antes de repetir la operación.`);
    } finally {
      setSaving(false);
    }
  }

  function addAthlete(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length > 150) {
      setError('Escribe el nombre del atleta (entre 1 y 150 caracteres).');
      return;
    }

    mutate(async () => {
      const created = await request('', {
        method: 'POST',
        body: JSON.stringify({
          fullName: cleanName,
          category,
          record1RmKg: Number(record1Rm)
        })
      });
      setAthletes(prev => [created, ...prev]);
      setFullName('');
    });
  }

  function updateCategory(athlete: Athlete) {
    const nextCategory = athlete.category === 'Primera División' ? 'Juveniles M19' : 'Primera División';
    mutate(async () => {
      await request(`/${athlete.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category: nextCategory })
      });
      setAthletes(prev => prev.map(a => a.id === athlete.id ? { ...a, category: nextCategory } : a));
    });
  }

  function deleteAthlete(athlete: Athlete) {
    mutate(async () => {
      await request(`/${athlete.id}`, { method: 'DELETE' });
      setAthletes(prev => prev.filter(a => a.id !== athlete.id));
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main aria-busy={busy} className="container" style={{ maxWidth: '750px', margin: '2rem auto', padding: '1rem' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ProTraining · Gestión de Atletas
        </p>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0.25rem 0' }}>Plantel y Récords de Fuerza</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>React → Nginx → ASP.NET Core (.NET 8) → PostgreSQL</p>
      </header>

      {/* Formulario de Alta */}
      <form onSubmit={addAthlete} style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
        <label htmlFor="fullName" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Nuevo Atleta</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            id="fullName"
            type="text"
            required
            maxLength={150}
            placeholder="Nombre y apellido (ej. Lucas Fernández)"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            disabled={busy || !ready}
            style={{ flex: '2', minWidth: '220px', margin: 0 }}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            disabled={busy || !ready}
            style={{ flex: '1', minWidth: '150px', margin: 0 }}
          >
            <option value="Primera División">Primera División</option>
            <option value="Juveniles M19">Juveniles M19</option>
            <option value="Intermedia">Intermedia</option>
          </select>
          <input
            type="number"
            min="0"
            max="500"
            step="2.5"
            placeholder="1RM kg"
            value={record1Rm}
            onChange={e => setRecord1Rm(Number(e.target.value))}
            disabled={busy || !ready}
            style={{ width: '100px', margin: 0 }}
            title="Récord 1RM en kg"
          />
          <button className="btn btn-primary" disabled={busy || !ready || !fullName.trim()}>
            Agregar
          </button>
        </div>
      </form>

      {error && (
        <p className="alert-banner danger" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {loading && <p role="status" style={{ color: '#64748b' }}>Cargando atletas…</p>}
      {saving && <p role="status" style={{ color: '#2563eb' }}>Guardando cambios…</p>}

      {/* Lista de Atletas */}
      <section aria-label="Lista de atletas">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontWeight: 600, color: '#475569' }}>{athletes.length} atletas registrados</p>
          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} disabled={busy} onClick={load}>
            Recargar
          </button>
        </div>

        {ready && !loading && athletes.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            Todavía no hay atletas registrados. ¡Agrega el primero!
          </p>
        )}

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {athletes.map(athlete => (
            <li
              key={athlete.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', display: 'block' }}>{athlete.fullName}</strong>
                <span className="badge badge-info" style={{ marginRight: '0.5rem' }}>{athlete.category}</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>1RM: <strong>{athlete.record1RmKg} kg</strong></span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                  disabled={busy}
                  onClick={() => updateCategory(athlete)}
                  title="Cambiar entre Primera y Juveniles"
                >
                  Cambiar categoría
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                  disabled={busy}
                  onClick={() => deleteAthlete(athlete)}
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
        Los datos viven en un volumen de PostgreSQL, no en el navegador.
      </footer>
    </main>
  );
};
