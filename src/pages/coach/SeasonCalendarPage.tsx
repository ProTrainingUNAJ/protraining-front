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
            orgs.map(async (org) => {
              try {
                const cats = await structureService.getCategories(org.id);
                return cats.map((cat) => ({
                  ...cat,
                  organizationName: org.name,
                }));
              } catch {
                return [] as Category[];
              }
            }),
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
      <div className="season-calendar-loading-box">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="season-calendar-loading-text">Cargando calendario de temporada y categorías...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="form-error-banner season-calendar-error-card"
        role="alert"
      >
        <AlertCircle size={22} />
        <div>
          <strong className="season-calendar-error-title">
            Error al sincronizar estructura deportiva
          </strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="season-calendar-page-wrap season-calendar-page-container">
      <SeasonCalendarView categories={categories} />
    </div>
  );
};
