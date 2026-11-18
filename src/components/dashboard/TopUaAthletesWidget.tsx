import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Trophy, Flame } from 'lucide-react';
import {
  fetchAllCategoriesAttendanceToday,
  AthleteAttendanceSummary,
} from '../../api/seguimientoService';
import { structureService } from '../../api/structureService';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface TopUaAthletesWidgetProps {
  className?: string;
}

export const TopUaAthletesWidget: React.FC<TopUaAthletesWidgetProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAllCategoriesAttendanceToday()
      .then((data) => {
        if (active) setAthletes(data);
      })
      .catch(() => {
        if (active) setAthletes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filtrar atletas con carga registrada (UA > 0) y ordenar descendente
  const athletesWithLoad = useMemo(() => {
    return athletes
      .filter((a) => (a.totalLoad ?? 0) > 0)
      .sort((a, b) => (b.totalLoad ?? 0) - (a.totalLoad ?? 0));
  }, [athletes]);

  const maxUa = athletesWithLoad.length > 0 ? (athletesWithLoad[0].totalLoad ?? 0) : 0;
  const topAthletes = athletesWithLoad.slice(0, 3);
  const leadersCount = athletesWithLoad.filter((a) => (a.totalLoad ?? 0) === maxUa).length;

  const handleOpenAttendance = () => {
    navigate('/pf/monitoring?tab=attendance');
  };

  return (
    <div
      className={`top-ua-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1rem 1.15rem',
        boxSizing: 'border-box',
      }}
      data-testid="top-ua-athletes-widget"
    >
      {/* Encabezado del Widget */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          paddingRight: '3.5rem', // Deja espacio para los controles de reordenamiento del wireframe
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Zap size={14} style={{ color: 'var(--traffic-green)' }} />
          Mayor Carga (UA)
        </span>

        {maxUa > 0 ? (
          <span
            style={{
              background: 'var(--traffic-green-bg)',
              color: 'var(--traffic-green)',
              border: '1px solid var(--traffic-green-border)',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.15rem 0.55rem',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Trophy size={11} />
            {leadersCount > 1 ? `${leadersCount} Líderes` : 'Líder Hoy'}
          </span>
        ) : (
          <span
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
            }}
          >
            Hoy
          </span>
        )}
      </div>

      {/* Contenido Central */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              padding: '0.75rem 0',
            }}
          >
            <span
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid var(--traffic-green)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Cargando cargas...</span>
          </div>
        ) : topAthletes.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0.4rem 0',
              gap: '0.25rem',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Sin cargas registradas hoy
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Los atletas aún no registraron minutos o RPE.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {topAthletes.map((athlete, idx) => {
              const isTop = (athlete.totalLoad ?? 0) === maxUa;
              const photoUrl = structureService.getAthletePhotoUrl(athlete.athleteId);

              return (
                <div
                  key={athlete.athleteId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isTop ? '0.45rem 0.6rem' : '0.35rem 0.5rem',
                    borderRadius: '14px',
                    background: isTop ? 'var(--traffic-green-bg)' : 'var(--bg-secondary)',
                    border: isTop ? '1.5px solid var(--traffic-green)' : '1px solid var(--border)',
                    boxShadow: isTop ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  data-testid={isTop ? 'top-ua-leader' : `top-ua-rank-${idx + 1}`}
                >
                  {/* Avatar y Nombre */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        borderRadius: '50%',
                        padding: isTop ? '2px' : '0',
                        background: isTop ? 'var(--traffic-green)' : 'transparent',
                      }}
                    >
                      <ProfileAvatar
                        src={photoUrl}
                        name={athlete.athleteName || 'Atleta'}
                        size={isTop ? 34 : 28}
                        shape="circle"
                      />
                      {isTop && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '-3px',
                            right: '-3px',
                            background: 'var(--traffic-green)',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                          title="Mayor Carga"
                        >
                          <Flame size={10} fill="#ffffff" />
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          fontSize: isTop ? '0.84rem' : '0.78rem',
                          fontWeight: isTop ? 800 : 600,
                          color: isTop ? 'var(--traffic-green-text)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {athlete.athleteName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {athlete.totalMinutes ?? 0} min totales
                      </span>
                    </div>
                  </div>

                  {/* UA destacada en verde */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      marginLeft: '0.5rem',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '0.2rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: isTop ? '1.05rem' : '0.88rem',
                          fontWeight: 900,
                          color: isTop ? 'var(--traffic-green)' : 'var(--text-secondary)',
                          lineHeight: 1,
                        }}
                      >
                        {athlete.totalLoad ?? 0}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: isTop ? 'var(--traffic-green)' : 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        UA
                      </span>
                    </div>

                    {isTop && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: 'var(--traffic-green)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        Mayor Carga
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie / Enlace a Asistencia & RPE */}
      <div
        style={{
          marginTop: '0.45rem',
          paddingTop: '0.35rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {athletesWithLoad.length > 0
            ? `${athletesWithLoad.length} atleta${athletesWithLoad.length > 1 ? 's' : ''} con registro`
            : 'Planilla de Asistencia & RPE'}
        </span>
        <button
          type="button"
          onClick={handleOpenAttendance}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--brand-blue, #0284c7)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title="Ver planilla completa de asistencia y RPE"
        >
          <span>Ver detalle</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};
