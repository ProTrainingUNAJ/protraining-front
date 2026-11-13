import React, { useEffect, useState } from 'react';
import { SeasonCalendarView } from '../../components/calendar/SeasonCalendarView';
import { structureService } from '../../api/structureService';
import { Category } from '../../types/structure';
import { AlertCircle, Loader2 } from 'lucide-react';

export const SeasonCalendarPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const orgs = await structureService.getOrganizations();
        if (!isMounted) return;

        if (orgs.length > 0) {
          const catsNested = await Promise.all(
            orgs.map((org) => structureService.getCategories(org.id).catch(() => [] as Category[])),
          );
          if (!isMounted) return;
          const flatCategories = catsNested.flat();
          setCategories(flatCategories);
        } else {
          setCategories([]);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar las categorías y la estructura del club.',
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '380px',
          gap: '1rem',
          color: 'var(--text-muted)',
        }}
      >
        <Loader2 size={36} className="animate-spin text-primary" />
        <p style={{ fontWeight: 500 }}>Cargando calendario de temporada y categorías...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="form-error-banner"
        style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.25rem' }}
        role="alert"
      >
        <AlertCircle size={22} />
        <div>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
            Error al sincronizar estructura deportiva
          </strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="season-calendar-page-wrap" style={{ width: '100%' }}>
      <SeasonCalendarView categories={categories} />
    </div>
  );
};
