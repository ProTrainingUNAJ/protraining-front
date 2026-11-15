import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/shell/AppShell';
import { AthleteConsentModal } from '../components/athlete/AthleteConsentModal';
import { useAuth } from '../context/AuthContext';
import { structureService } from '../api/structureService';
import { getHttpErrorStatus, PENDING_INVITATION_TOKEN_KEY } from '../api/categoryInvitations';
import type { GetMyConsentResponse } from '../api/generated/estructura';
import '../styles/medicalRecord.css';

export function AthleteLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consentStatus, setConsentStatus] = useState<GetMyConsentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
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
          setMissingProfile(false);
        }
      } catch (err: unknown) {
        console.error('Error al consultar estado de consentimiento del atleta:', err);
        if (isMounted) {
          const status = getHttpErrorStatus(err);
          const errStr = (err instanceof Error ? err.message : '').toLowerCase();
          const isNotFound =
            status === 404 || errStr.includes('no encontrado') || errStr.includes('notfound');

          if (isNotFound) {
            // Atleta con cuenta creada en Identidad pero sin perfil en Estructura (KAN-573)
            let pendingToken: string | null = null;
            try {
              pendingToken = localStorage.getItem(PENDING_INVITATION_TOKEN_KEY);
            } catch {
              // ignore
            }
            if (pendingToken) {
              setIsRedirecting(true);
              navigate(`/invite/${pendingToken}`, { replace: true });
              return;
            }
            setMissingProfile(true);
            return;
          }

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
  }, [user, reloadTrigger, navigate]);

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

  if (isRedirecting) {
    return null;
  }

  if (missingProfile) {
    return (
      <main className="invitation-page">
        <div className="invitation-container invitation-state-card" role="alert">
          <div className="invitation-icon-circle invitation-icon-circle--warning">
            <AlertTriangle size={32} />
          </div>
          <h1 className="invitation-title">Invitación pendiente</h1>
          <p className="invitation-description">
            Tu cuenta está registrada pero aún no completaste la invitación a tu categoría. Abrí el
            enlace que te envió tu preparador físico para completar el registro.
          </p>
        </div>
      </main>
    );
  }

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
                <AlertTriangle size={22} className="consent-error-icon" aria-hidden="true" />
                <span>Error al verificar consentimiento</span>
              </h2>
            </div>
            <div className="medical-modal-body">
              <div className="medical-notice-box consent-error-box">
                <div>{fetchError}</div>
              </div>
              <p className="consent-error-help-text">
                Es necesario validar tu consentimiento legal antes de acceder a la plataforma.
              </p>
            </div>
            <div className="medical-modal-footer">
              <button
                type="button"
                className="btn btn-primary consent-retry-btn"
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
