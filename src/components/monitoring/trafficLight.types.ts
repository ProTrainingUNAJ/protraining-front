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
  avatarUrl?: string;
  submittedAt?: string;
}
