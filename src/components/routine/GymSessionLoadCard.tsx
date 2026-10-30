import React, { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Send, CheckCircle2, AlertTriangle, Clock, Activity } from 'lucide-react';
import {
  getDailyLoad,
  submitDailyLoad,
  type DailyLoadSubmitResponse,
  type DailyLoadSubmitRequest,
} from '../../api/seguimientoService';
import axios from 'axios';

export interface GymSessionLoadCardProps {
  athleteId: string;
}

export function GymSessionLoadCard({ athleteId }: GymSessionLoadCardProps) {
  const [minutes, setMinutes] = useState<number>(60);
  const [rpe, setRpe] = useState<number | null>(7);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayLoad, setTodayLoad] = useState<DailyLoadSubmitResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar carga registrada hoy si existe
  const fetchTodayLoad = useCallback(async () => {
    if (!athleteId) return;
    setIsLoading(true);
    try {
      const data = await getDailyLoad(athleteId);
      setTodayLoad(data);
      if (data.gym?.minutes) {
        setMinutes(data.gym.minutes);
      }
      if (data.gym?.rpe !== undefined && data.gym?.rpe !== null) {
        setRpe(data.gym.rpe);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Aún no hay registro de carga hoy
        setTodayLoad(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchTodayLoad();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchTodayLoad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (minutes < 0) {
      setErrorMessage('Los minutos deben ser 0 o más.');
      return;
    }

    if (rpe !== null && (rpe < 0 || rpe > 10)) {
      setErrorMessage('El RPE debe estar entre 0 y 10.');
      return;
    }

    if (minutes > 0 && rpe === null) {
      setErrorMessage('El RPE es obligatorio si indicás minutos mayores a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DailyLoadSubmitRequest = {
        gym: { minutes: minutes || 0, rpe },
        // Preservar otras actividades si ya estaban cargadas
        sportTraining: todayLoad?.sportTraining,
        match1: todayLoad?.match1,
        match2: todayLoad?.match2,
        individualWork: todayLoad?.individualWork,
      };

      const response = await submitDailyLoad(athleteId, payload);
      setTodayLoad(response);
      setSuccessMessage(
        `¡Carga de gimnasio guardada! (${minutes} min · RPE ${rpe ?? '—'}). Sumada al total del día.`,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al guardar la carga de la sesión.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasGymRegistered = todayLoad?.gym && todayLoad.gym.minutes > 0;

  return (
    <div className="card routine-session-load-card">
      <div className="routine-session-load-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="routine-session-load-icon">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="routine-session-load-title">
              Finalizar sesión · Carga del entrenamiento
            </h3>
            <p className="routine-session-load-subtitle">
              Coordinación KAN-442: Registrá minutos y RPE de gimnasio en esta misma pantalla
            </p>
          </div>
        </div>

        {hasGymRegistered && (
          <span className="badge badge-success" style={{ gap: '0.35rem' }}>
            <CheckCircle2 size={13} />
            <span>
              Registrado: {todayLoad.gym.minutes} min · RPE {todayLoad.gym.rpe ?? '—'}
            </span>
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Verificando carga del día...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="routine-session-load-form">
          <div className="routine-session-load-grid">
            <div className="routine-record-input-group">
              <label htmlFor="gym-minutes-input" className="routine-record-label">
                <Clock size={15} />
                <span>Minutos en el gimnasio</span>
              </label>
              <div className="routine-record-input-wrapper">
                <input
                  id="gym-minutes-input"
                  type="number"
                  min="0"
                  max="360"
                  value={minutes}
                  onChange={(e) => {
                    setMinutes(parseInt(e.target.value, 10) || 0);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  className="routine-record-input"
                  placeholder="Ej. 60"
                  required
                />
                <span className="routine-record-input-unit">min</span>
              </div>
              <small className="routine-record-hint">
                Tiempo total de la sesión (calentamiento, series y estiramiento)
              </small>
            </div>

            <div className="routine-record-input-group">
              <label htmlFor="gym-rpe-input" className="routine-record-label">
                <Dumbbell size={15} />
                <span>RPE de esfuerzo percibido (0 a 10)</span>
              </label>
              <div className="routine-record-input-wrapper">
                <input
                  id="gym-rpe-input"
                  type="number"
                  min="0"
                  max="10"
                  value={rpe ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRpe(val === '' ? null : parseInt(val, 10));
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  className="routine-record-input"
                  placeholder="Ej. 7"
                  required
                />
                <span className="routine-record-input-unit">0-10</span>
              </div>
              <small className="routine-record-hint">
                0: Sin esfuerzo · 5-7: Exigente · 10: Esfuerzo máximo
              </small>
            </div>
          </div>

          {/* Selector rápido de RPE con botones táctiles ergonómicos */}
          <div className="routine-rpe-chips-row">
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Selección rápida RPE:
            </span>
            <div className="routine-rpe-chips-group">
              {[5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`routine-rpe-chip ${rpe === val ? 'selected' : ''}`}
                  onClick={() => {
                    setRpe(val);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {successMessage && (
            <div className="routine-session-load-feedback success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="routine-session-load-feedback error">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ gap: '0.45rem', padding: '0.65rem 1.25rem' }}
            >
              {isSubmitting ? (
                <span>Guardando carga...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>
                    {hasGymRegistered
                      ? 'Actualizar carga de gimnasio'
                      : 'Guardar carga de la sesión'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
