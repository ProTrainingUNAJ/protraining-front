import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PainAlertItem {
  id: string;
  athleteName: string;
  zone: string;
  level: number; // 1-5
}

const MOCK_PAIN_ALERTS: PainAlertItem[] = [
  { id: 'p-1', athleteName: 'Joaquín Silva', zone: 'Isquiotibial der.', level: 4 },
  { id: 'p-2', athleteName: 'Santiago Gómez', zone: 'Rodilla izq.', level: 5 },
];

export const PainAlertsWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`pain-alerts-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1.15rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--pain-level-5)' }} />
          Alertas de Dolor
        </span>
        <span
          className="badge"
          style={{
            background: 'var(--pain-level-5-bg)',
            color: 'var(--pain-level-5)',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
          }}
        >
          {MOCK_PAIN_ALERTS.length} Críticos
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {MOCK_PAIN_ALERTS.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate('/pf/monitoring')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 0.65rem',
              borderRadius: '10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>
                {item.athleteName}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.zone}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: item.level === 5 ? 'var(--pain-level-5)' : 'var(--pain-level-4)',
                  background:
                    item.level === 5 ? 'var(--pain-level-5-bg)' : 'var(--pain-level-4-bg)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                Nivel {item.level}
              </span>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        ))}
      </div>

      <small
        style={{
          display: 'block',
          color: 'var(--text-muted)',
          fontSize: '0.7rem',
          marginTop: '0.35rem',
        }}
      >
        Revisar antes de asignar cargas de velocidad y saltos
      </small>
    </div>
  );
};
