export type TrafficLightStatus = 'red' | 'yellow' | 'green' | 'gray';

export interface PainZoneReport {
  zone: string;
  muscleId?: string;
  level: number; // 1 to 5
}

export interface AthleteTrafficLightItem {
  id: string;
  name: string;
  position: string;
  category: string;
  status: TrafficLightStatus;
  statusLabel: string;
  recommendation: string;
  sleepHours?: number;
  sleepQuality?: string;
  rpe?: number;
  pains?: PainZoneReport[];
  notes?: string;
  /** URL de la foto de perfil del atleta. Si está presente se renderiza en la tarjeta y ficha rápida; si no, hace fallback a las iniciales (ej. 'SG') */
  avatarUrl?: string;
  submittedAt?: string;
  affectedMuscle?: string;
  /** Señales del check-in del día (KAN-365): true solo si el atleta reportó hoy. */
  isSick?: boolean;
  hasActiveInjury?: boolean;
}
