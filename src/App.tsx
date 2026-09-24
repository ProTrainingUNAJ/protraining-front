import React, { useState, useEffect } from 'react';
import { apiRequest } from './api/client';
import { UserSession, Organization, Category, Athlete, TodayRoutine, PreventiveAlert, InjuryItem } from './types';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Heart,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  ShieldAlert,
  User,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routine' | 'checkin' | 'athletes' | 'alerts' | 'injuries'>('dashboard');

  // Estados de datos
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [alerts, setAlerts] = useState<PreventiveAlert[]>([]);
  const [todayRoutine, setTodayRoutine] = useState<TodayRoutine | null>(null);
  const [injuries, setInjuries] = useState<InjuryItem[]>([]);

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados para Check-in Atleta
  const [effort, setEffort] = useState(7);
  const [sleep, setSleep] = useState(7.5);
  const [mood, setMood] = useState(4);
  const [painZone, setPainZone] = useState('');

  // Login automático al montar con cuenta demo si no hay sesión
  useEffect(() => {
    const saved = localStorage.getItem('protraining_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch {
        localStorage.removeItem('protraining_session');
      }
    }
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem('protraining_session', JSON.stringify(session));
      localStorage.setItem('protraining_token', session.token);
      loadInitialData();
    } else {
      localStorage.removeItem('protraining_session');
      localStorage.removeItem('protraining_token');
    }
  }, [session]);

  const handleLoginDemo = async (role: 'PF' | 'Athlete') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const email = role === 'PF' ? 'pf@protraining.com' : 'atleta@protraining.com';
      const res = await apiRequest<UserSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'Password123!' })
      });
      setSession(res);
      setActiveTab(role === 'PF' ? 'dashboard' : 'routine');
      setSuccessMsg(`Sesión iniciada como ${res.fullName}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setOrganizations([]);
    setAthletes([]);
    setAlerts([]);
    setTodayRoutine(null);
  };

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (session?.role === 'PF') {
        const [orgsRes, athletesRes, alertsRes] = await Promise.all([
          apiRequest<Organization[]>('/organizations').catch(() => []),
          apiRequest<Athlete[]>('/athletes').catch(() => []),
          apiRequest<PreventiveAlert[]>('/alerts').catch(() => [])
        ]);
        setOrganizations(orgsRes);
        setAthletes(athletesRes);
        setAlerts(alertsRes);
      } else if (session?.athleteId) {
        const [routineRes, injuriesRes] = await Promise.all([
          apiRequest<TodayRoutine>(`/routines/today/${session.athleteId}`).catch(() => null),
          apiRequest<InjuryItem[]>(`/tracking/injuries/${session.athleteId}`).catch(() => [])
        ]);
        setTodayRoutine(routineRes);
        setInjuries(injuriesRes);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.athleteId) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      await apiRequest('/tracking/check-in', {
        method: 'POST',
        body: JSON.stringify({
          athleteId: session.athleteId,
          effortRate: effort,
          sleepHours: sleep,
          moodRate: mood,
          painZones: painZone
        })
      });
      setSuccessMsg('¡Check-in diario enviado en menos de 30 segundos! Tus datos fueron sincronizados.');
      setActiveTab('routine');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAlert = async (alertId: string) => {
    try {
      await apiRequest(`/alerts/${alertId}/review`, { method: 'PATCH' });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isReviewed: true } : a));
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Datos para gráficos de Recharts
  const chartData = [
    { dia: 'Lun', esfuerzo: 7, sueno: 7 },
    { dia: 'Mar', esfuerzo: 8, sueno: 6 },
    { dia: 'Mié', esfuerzo: 9, sueno: 4.5 },
    { dia: 'Jue', esfuerzo: 8, sueno: 5 },
    { dia: 'Vie', esfuerzo: 6, sueno: 8 }
  ];

  return (
    <div>
      {/* Barra de navegación */}
      <header className="navbar">
        <div className="nav-content">
          <div className="brand">
            <Dumbbell size={26} />
            <span>ProTraining</span>
          </div>

          {session ? (
            <div className="nav-links">
              {session.role === 'PF' ? (
                <>
                  <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                    <Activity size={18} /> Dashboard
                  </button>
                  <button className={`nav-btn ${activeTab === 'athletes' ? 'active' : ''}`} onClick={() => setActiveTab('athletes')}>
                    <Users size={18} /> Atletas y Clubes
                  </button>
                  <button className={`nav-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
                    <ShieldAlert size={18} /> Avisos {alerts.filter(a => !a.isReviewed).length > 0 && `(${alerts.filter(a => !a.isReviewed).length})`}
                  </button>
                </>
              ) : (
                <>
                  <button className={`nav-btn ${activeTab === 'routine' ? 'active' : ''}`} onClick={() => setActiveTab('routine')}>
                    <Calendar size={18} /> Rutina de Hoy
                  </button>
                  <button className={`nav-btn ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => setActiveTab('checkin')}>
                    <Heart size={18} /> Check-in Diario
                  </button>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                <span className="badge badge-info">{session.role === 'PF' ? 'Preparador Físico' : 'Atleta'}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{session.fullName}</span>
                <button className="nav-btn" onClick={handleLogout} title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => handleLoginDemo('PF')} disabled={loading}>
                Acceso Demo PF
              </button>
              <button className="btn btn-primary" onClick={() => handleLoginDemo('Athlete')} disabled={loading}>
                Acceso Demo Atleta
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Contenedor principal */}
      <main className="container">
        {errorMsg && (
          <div className="alert-banner danger">
            <span>{errorMsg}</span>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }} onClick={() => setErrorMsg(null)}>✕</button>
          </div>
        )}

        {successMsg && (
          <div className="alert-banner success">
            <span>{successMsg}</span>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }} onClick={() => setSuccessMsg(null)}>✕</button>
          </div>
        )}

        {/* Pantalla de Bienvenida si no está autenticado */}
        {!session && (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <Dumbbell size={54} color="#2563eb" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Plataforma ProTraining</h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Monolito modular en .NET 8 con PostgreSQL y React. Centraliza organizaciones, calcula rutinas con redondeo fijo a 2,5 kg y emite avisos preventivos de fatiga.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => handleLoginDemo('PF')} style={{ minWidth: '220px' }}>
                <User size={18} /> Iniciar como Preparador Físico
              </button>
              <button className="btn btn-secondary" onClick={() => handleLoginDemo('Athlete')} style={{ minWidth: '220px' }}>
                <Activity size={18} /> Iniciar como Atleta (Lucas Fernández)
              </button>
            </div>
          </div>
        )}

        {/* PANEL DEL PREPARADOR FÍSICO (PF) */}
        {session && session.role === 'PF' && (
          <>
            {activeTab === 'dashboard' && (
              <div>
                <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
                  <div className="card">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Organizaciones & Clubes</p>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>{organizations.length}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Club Quilmes, Gym Spartacus</p>
                  </div>
                  <div className="card">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Atletas Registrados</p>
                    <h2 style={{ fontSize: '2rem', color: 'var(--success)' }}>{athletes.length || 1}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atletas en múltiples categorías</p>
                  </div>
                  <div className="card">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Avisos Preventivos Activos</p>
                    <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>{alerts.filter(a => !a.isReviewed).length}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detección de sobrecarga o molestias</p>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="card">
                    <div className="card-header">
                      <h3>Tendencia de Carga y Fatiga (Última Semana)</h3>
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="esfuerzo" fill="#2563eb" name="Esfuerzo (RPE 1-10)" />
                          <Bar dataKey="sueno" fill="#10b981" name="Horas de Sueño" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Avisos Preventivos Recientes</h3>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem' }} onClick={loadInitialData}>
                        <RefreshCw size={14} /> Actualizar
                      </button>
                    </div>
                    {alerts.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No hay avisos preventivos en este momento. Los atletas están descansados.</p>
                    ) : (
                      alerts.slice(0, 3).map(alert => (
                        <div key={alert.id} style={{ borderLeft: '4px solid #dc2626', padding: '0.75rem', marginBottom: '0.75rem', background: '#fef2f2', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>{alert.athleteName}</strong>
                            <span className="badge badge-danger">{alert.severity}</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{alert.reason}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sugerencia: {alert.suggestion}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'athletes' && (
              <div className="card">
                <div className="card-header">
                  <h3>Planteles y Atletas</h3>
                  <span className="badge badge-info">Filtro Global por Cuenta Activado</span>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Demostración CU-02: Un atleta puede pertenecer a más de una categoría (ej. Juveniles y Primera División).
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem' }}>Atleta</th>
                        <th style={{ padding: '0.75rem' }}>Contacto</th>
                        <th style={{ padding: '0.75rem' }}>Categorías Asignadas</th>
                        <th style={{ padding: '0.75rem' }}>Ficha Médica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {athletes.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{a.firstName} {a.lastName}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{a.email}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {a.categoryNames.map((c, i) => (
                              <span key={i} className="badge badge-info" style={{ marginRight: '0.4rem' }}>{c}</span>
                            ))}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{a.medicalConditions || 'Apto físico al día'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="card">
                <div className="card-header">
                  <h3>Centro de Avisos Preventivos (CU-09)</h3>
                  <button className="btn btn-secondary" onClick={() => apiRequest('/alerts/trigger-scan', { method: 'POST' }).then(loadInitialData)}>
                    <RefreshCw size={14} /> Forzar Análisis Diario
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {alerts.map(a => (
                    <div key={a.id} className="card" style={{ margin: 0, borderLeft: `5px solid ${a.severity === 'Alta' ? '#dc2626' : '#d97706'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4>{a.athleteName}</h4>
                        <span className={`badge ${a.severity === 'Alta' ? 'badge-danger' : 'badge-warning'}`}>Severidad {a.severity}</span>
                      </div>
                      <p style={{ margin: '0.5rem 0', fontWeight: 500 }}>{a.reason}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>💡 Sugerencia: {a.suggestion}</p>
                      {!a.isReviewed && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleReviewAlert(a.id)}>
                            <CheckCircle2 size={14} /> Marcar como Revisado
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* VISTA DEL ATLETA (MOBILE-FIRST) */}
        {session && session.role === 'Athlete' && (
          <div>
            {activeTab === 'routine' && (
              <div>
                <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2>Rutina del Día · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Pesos precalculados automáticamente sobre tus récords 1RM con redondeo a discos de 2,5 kg.
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setActiveTab('checkin')}>
                      Completar Check-in (&lt; 30s)
                    </button>
                  </div>
                </div>

                {todayRoutine?.exercises.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <Calendar size={40} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                    <p>No tienes ejercicios asignados para el día de hoy.</p>
                  </div>
                ) : (
                  todayRoutine?.exercises.map((item, idx) => (
                    <div key={idx} className="exercise-card">
                      <div>
                        <span className="badge badge-info">{item.muscleGroup}</span>
                        <h3 style={{ margin: '0.25rem 0' }}>{item.exerciseName}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          Prescripción: <strong>{item.sets} series × {item.reps} reps</strong> al {item.percentage}% del RM (1RM vigente: {item.currentOneRepMax} kg)
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cargar en la barra</span>
                        <div className="exercise-weight-highlight">{item.prescribedWeightKg} kg</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'checkin' && (
              <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="card-header">
                  <h3>Check-in Diario (&lt; 30 segundos)</h3>
                  <Heart size={20} color="#dc2626" />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Tu preparador físico utiliza estos datos para prevenir lesiones y ajustar las cargas del día.
                </p>

                <form onSubmit={handleCheckInSubmit}>
                  <div>
                    <label><strong>1. Esfuerzo percibido del último entrenamiento (RPE 1-10): {effort}</strong></label>
                    <input type="range" min="1" max="10" value={effort} onChange={e => setEffort(Number(e.target.value))} />
                  </div>

                  <div>
                    <label><strong>2. Horas de sueño: {sleep} hs</strong></label>
                    <input type="number" step="0.5" min="0" max="24" value={sleep} onChange={e => setSleep(Number(e.target.value))} />
                  </div>

                  <div>
                    <label><strong>3. Estado de ánimo (1 al 5): {mood}</strong></label>
                    <input type="range" min="1" max="5" value={mood} onChange={e => setMood(Number(e.target.value))} />
                  </div>

                  <div>
                    <label><strong>4. ¿Molestias o dolor muscular? (Ej: Rodilla derecha, Hombro)</strong></label>
                    <input type="text" placeholder="Ninguna o especificar zona" value={painZone} onChange={e => setPainZone(e.target.value)} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                    Enviar Check-in en 1 Clic
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
