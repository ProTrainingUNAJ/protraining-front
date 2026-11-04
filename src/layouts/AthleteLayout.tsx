import { useState, useEffect } from 'react';
import { AppShell } from '../components/shell/AppShell';
import { AthleteConsentModal } from '../components/athlete/AthleteConsentModal';
import { useAuth } from '../context/AuthContext';
import { structureService } from '../api/structureService';
import { AthleteConsentStatus } from '../types/structure';

export function AthleteLayout() {
  const { user } = useAuth();
  const [consentStatus, setConsentStatus] = useState<AthleteConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        }
      } catch (err: unknown) {
        // En caso de error de red o backend temporal, no bloqueamos erróneamente sin feedback
        console.error('Error al consultar estado de consentimiento del atleta:', err);
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
  }, [user]);

  // Mostrar el modal si ya se cargó el estado del backend y el consentimiento aún no fue firmado
  const showConsentModal = Boolean(!loading && consentStatus && !consentStatus.hasSignedConsent);

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
