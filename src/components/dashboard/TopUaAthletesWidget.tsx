import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Trophy, Flame } from 'lucide-react';
import {
  fetchAllCategoriesAttendanceToday,
  AthleteAttendanceSummary,
} from '../../api/seguimientoService';
import { structureService } from '../../api/structureService';
import { ProfileAvatar } from '../common/ProfileAvatar';

// "Lucas Gómez" → "Lucas G.": entra debajo de la foto sin romper el podio.
function shortName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const lastInitial = rest.length > 0 ? ` ${rest[rest.length - 1].charAt(0)}.` : '';
  return `${first ?? fullName}${lastInitial}`;
}

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
  const athlete1 = athletesWithLoad[0] ?? null; // 1° Puesto (Centro)
  const athlete2 = athletesWithLoad[1] ?? null; // 2° Puesto (Izquierda)
  const athlete3 = athletesWithLoad[2] ?? null; // 3° Puesto (Derecha)
  const leadersCount = athletesWithLoad.filter((a) => (a.totalLoad ?? 0) === maxUa).length;

  const handleOpenAttendance = () => {
    navigate('/pf/monitoring?tab=attendance', { state: { tab: 'attendance' } });
  };

  const podiumSteps = [
    {
      rank: 2,
      athlete: athlete2,
      pedestalHeight: 52,
      avatarSize: 36,
      bg: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      numberColor: 'var(--text-muted)',
      isWinner: false,
      testId: 'podium-step-2',
    },
    {
      rank: 1,
      athlete: athlete1,
      pedestalHeight: 74,
      avatarSize: 44,
      bg: athlete1 ? 'var(--info-bg)' : 'var(--bg-secondary)',
      border: athlete1 ? '1.5px solid var(--primary)' : '1px solid var(--border)',
      numberColor: athlete1 ? 'var(--primary-text)' : 'var(--text-muted)',
      isWinner: Boolean(athlete1),
      testId: 'podium-step-1',
    },
    {
      rank: 3,
      athlete: athlete3,
      pedestalHeight: 38,
      avatarSize: 32,
      bg: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      numberColor: 'var(--text-muted)',
      isWinner: false,
      testId: 'podium-step-3',
    },
  ];

  return (
    <div
      className={`top-ua-widget ${className}`}
      onClick={handleOpenAttendance}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1rem 1.15rem',
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
      data-testid="top-ua-athletes-widget"
      title="Hacé clic para ver la planilla de Asistencia & RPE"
    >
      {/* Encabezado del Widget */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.35rem',
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
          <Zap size={14} style={{ color: 'var(--primary)' }} />
          Mayor Carga (UA)
        </span>

        {maxUa > 0 ? (
          <span
            style={{
              background: 'var(--info-bg)',
              color: 'var(--primary-text)',
              border: '1px solid var(--primary)',
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
            {leadersCount > 1 ? `${leadersCount} Líderes` : 'Podio Hoy'}
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

      {/* Contenido Central: Podio 1, 2, 3 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingTop: '0.25rem',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              padding: '1.25rem 0',
            }}
          >
            <span
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid var(--primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Cargando podio...</span>
          </div>
        ) : athletesWithLoad.length === 0 ? (
          // Sin cargas no se dibuja el podio: escalones con guiones parecen datos (KAN-594)
          <p
            data-testid="top-ua-empty"
            style={{
              margin: 0,
              alignSelf: 'center',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              padding: '1.25rem 0',
            }}
          >
            Sin cargas registradas hoy
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '0.65rem',
              width: '100%',
              padding: '0.35rem 0.25rem 0.15rem',
              boxSizing: 'border-box',
            }}
            data-testid="top-ua-podium"
          >
            {podiumSteps.map((step) => {
              const photoUrl = step.athlete
                ? structureService.getAthletePhotoUrl(step.athlete.athleteId)
                : null;

              return (
                <div
                  key={step.rank}
                  data-testid={step.testId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flex: 1,
                    maxWidth: '84px',
                    minWidth: '58px',
                  }}
                >
                  {/* Encima del número: SOLO LA FOTO. En caso de no haber, no aparece nadie */}
                  <div
                    style={{
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.35rem',
                    }}
                  >
                    {step.athlete ? (
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          borderRadius: '50%',
                          padding: step.isWinner ? '2px' : '1px',
                          background: step.isWinner ? 'var(--primary)' : 'var(--border)',
                          boxShadow: step.isWinner ? '0 0 10px rgba(2, 132, 199, 0.35)' : 'none',
                        }}
                        title={`${step.athlete.athleteName || 'Atleta'}: ${step.athlete.totalLoad ?? 0} UA (${step.athlete.totalMinutes ?? 0} min)`}
                      >
                        <ProfileAvatar
                          src={photoUrl}
                          name={step.athlete.athleteName || 'Atleta'}
                          size={step.avatarSize}
                          shape="circle"
                          alt={`Foto de perfil de ${step.athlete.athleteName || 'Atleta'}`}
                        />
                        {step.isWinner && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: 'var(--primary)',
                              color: '#ffffff',
                              borderRadius: '50%',
                              width: '15px',
                              height: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }}
                            title="Mayor Carga (Líder)"
                          >
                            <Flame size={10} fill="#ffffff" />
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Nombre corto visible; el completo va como texto para lectores de pantalla */}
                  {step.athlete && (
                    <span
                      aria-hidden="true"
                      style={{
                        maxWidth: '100%',
                        marginBottom: '0.3rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortName(step.athlete.athleteName || 'Atleta')}
                    </span>
                  )}

                  {/* Escalón del Podio con el Número y las UA */}
                  <div
                    style={{
                      width: '100%',
                      height: `${step.pedestalHeight}px`,
                      background: step.bg,
                      border: step.border,
                      borderRadius: '12px 12px 4px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      boxShadow: step.isWinner
                        ? '0 2px 8px rgba(2, 132, 199, 0.18)'
                        : '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: step.isWinner ? '1.35rem' : '1.1rem',
                        fontWeight: 900,
                        color: step.numberColor,
                        lineHeight: 1,
                      }}
                    >
                      {step.rank}
                    </span>

                    <span
                      style={{
                        fontSize: step.isWinner ? '0.74rem' : '0.68rem',
                        fontWeight: 800,
                        color: step.isWinner ? 'var(--primary-text)' : 'var(--text-secondary)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step.athlete ? (
                        <>
                          <span className="sr-only">{step.athlete.athleteName}</span>
                          <span>{step.athlete.totalLoad ?? 0}</span> UA
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
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
            : ''}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAttendance();
          }}
          className="btn btn-primary dash-w__cta"
          title="Ver planilla completa de asistencia y RPE"
        >
          <span>Ver detalle</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};
