import { useState } from 'react';
import { AppShell } from '../components/shell/AppShell';
import { AthleteConsentModal } from '../components/athlete/AthleteConsentModal';
import { useAuth } from '../context/AuthContext';

export function AthleteLayout() {
  const { user } = useAuth();
  // In-memory state tracking signed consents for active session
  const [signedConsents, setSignedConsents] = useState<Record<string, boolean>>({});

  // Show blocking consent modal without dismissal when athlete has not signed digital consent yet
  const showConsentModal = Boolean(
    user &&
    !signedConsents[user.id] &&
    (typeof window === 'undefined' ||
      !localStorage.getItem(`protraining_athlete_consent_${user.id}`)),
  );

  const handleConsentSigned = (consentData: {
    signedAt: string;
    allowsPhysicalTraining: boolean;
    allowsHabitsRecommendations: boolean;
  }) => {
    if (!user) return;
    const consentStorageKey = `protraining_athlete_consent_${user.id}`;
    localStorage.setItem(
      consentStorageKey,
      JSON.stringify({
        ...consentData,
        athleteId: user.id,
        athleteName: user.fullName,
      }),
    );
    setSignedConsents((prev) => ({ ...prev, [user.id]: true }));
  };

  return (
    <>
      <AppShell role="athlete" />
      {showConsentModal && (
        <AthleteConsentModal
          athleteName={user?.fullName || 'Atleta'}
          isOpen={true}
          onConsentSigned={handleConsentSigned}
        />
      )}
    </>
  );
}
