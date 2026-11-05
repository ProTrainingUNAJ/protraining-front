import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/shell/AppShell';
import { AthleteConsentModal } from '../components/athlete/AthleteConsentModal';
import { useAuth } from '../context/AuthContext';
import { structureService } from '../api/structureService';
import { AthleteConsentStatus } from '../types/structure';
import '../styles/medicalRecord.css';

export function AthleteLayout() {
  const { user } = useAuth();
  const [consentStatus, setConsentStatus] = useState<AthleteConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchConsent() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const status = await structureService.getMyConsent();
        if (isMounted) {
          setConsentStatus(status);
          setFetchError(null);
        }
      } catch (err: unknown) {
        console.error('Error al consultar estado de consentimiento del atleta:', err);
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'No se pudo verificar el estado de tu consentimiento digital.';
          setFetchError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchConsent();

    return () => {
      isMounted = false;
    };
  }, [user, reloadTrigger]);

  const handleRetry = () => {
    setLoading(true);
    setFetchError(null);
    setReloadTrigger((prev) => prev + 1);
  };

  // Mostrar el modal si ya se cargó el estado del backend sin errores y el consentimiento aún no fue firmado
  const showConsentModal = Boolean(
    !loading && !fetchError && consentStatus && !consentStatus.hasSignedConsent,
  );

  const handleConsentSigned = async (consentData: {
    allowsPhysicalTraining: boolean;
    allowsHabitsRecommendations: boolean;
  }) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updatedStatus = await structureService.registerMyConsent(consentData);
      setConsentStatus(updatedStatus);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error al registrar el consentimiento.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppShell role="athlete" />

      {/* Modal de error bloqueante si falla la validación del consentimiento digital */}
      {fetchError && (
        <div className="consent-modal-overlay" role="presentation">
          <div
            className="consent-modal-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="consent-error-title"
          >
            <div className="medical-modal-header">
              <h2 id="consent-error-title" className="medical-modal-title">
                <AlertTriangle
                  size={22}
                  style={{ color: 'var(--danger, #dc2626)' }}
                  aria-hidden="true"
                />
                <span>Error al verificar consentimiento</span>
              </h2>
            </div>
            <div className="medical-modal-body">
              <div
                className="medical-notice-box"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'var(--danger, #dc2626)',
                  color: 'var(--danger, #dc2626)',
                }}
              >
                <div>{fetchError}</div>
              </div>
              <p
                style={{
                  margin: '0.75rem 0 0.25rem 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                Es necesario validar tu consentimiento legal antes de acceder a la plataforma.
              </p>
            </div>
            <div className="medical-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleRetry}
              >
                <RefreshCw size={18} aria-hidden="true" />
                <span>Reintentar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de consentimiento requerido si aún no firmó */}
      {showConsentModal && consentStatus && (
        <AthleteConsentModal
          athleteName={user?.fullName || 'Atleta'}
          isOpen={true}
          isMinor={consentStatus.isMinor}
          hasGuardianConsent={consentStatus.hasSignedConsent}
          onConsentSigned={handleConsentSigned}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      )}
    </>
  );
}
