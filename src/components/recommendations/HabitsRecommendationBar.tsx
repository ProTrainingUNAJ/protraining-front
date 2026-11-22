import { useState } from 'react';
import { Loader2, Salad } from 'lucide-react';
import { recommendationsService } from '../../api/recommendations';

export interface HabitsAthleteOption {
  id: string;
  name: string;
}

interface HabitsRecommendationBarProps {
  athletes: HabitsAthleteOption[];
  onGenerated: (athleteName: string) => void | Promise<void>;
  onError: (message: string) => void;
}

// Hábitos y alimentación para un atleta (KAN-634): el PF la pide, el back la arma con las reglas (proteína según
// peso y objetivo, ficha médica, menores) y queda pendiente en la bandeja hasta que la apruebe.
export function HabitsRecommendationBar({
  athletes,
  onGenerated,
  onError,
}: HabitsRecommendationBarProps) {
  const [athleteId, setAthleteId] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const athlete = athletes.find((option) => option.id === athleteId);
    if (!athlete || generating) return;
    setGenerating(true);
    try {
      await recommendationsService.generateHabitsForAthlete(athlete.id);
      await onGenerated(athlete.name);
    } catch (err: unknown) {
      onError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la recomendación de hábitos y alimentación.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="recommendations-engine-section">
      <section
        className="recommendations-engine-bar"
        aria-label="Generar recomendación de hábitos y alimentación"
      >
        <Salad size={20} className="recommendations-engine-sparkle" aria-hidden="true" />
        <strong className="recommendations-engine-title">Hábitos y alimentación</strong>

        <select
          className="recommendations-select"
          value={athleteId}
          onChange={(e) => setAthleteId(e.target.value)}
          aria-label="Atleta para la recomendación de hábitos"
          disabled={generating}
        >
          <option value="">Elegí un atleta</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="recommendations-engine-btn"
          onClick={() => void handleGenerate()}
          disabled={!athleteId || generating}
        >
          {generating && <Loader2 size={13} className="plan-spin" aria-hidden="true" />}
          <span>{generating ? 'Generando…' : 'Generar'}</span>
        </button>
      </section>

      <p className="recommendations-engine-desc">
        Proteína según su peso y objetivo, sin suplementos ni pautas para bajar de peso, y con el
        aviso de consultar a un nutricionista. Si la ficha médica marca alguna condición, se lo
        deriva a un profesional.
      </p>
    </div>
  );
}
