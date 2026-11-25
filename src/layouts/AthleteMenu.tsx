import type { ComponentType } from 'react';
import { Home, Dumbbell, ClipboardList, BarChart3, Activity } from 'lucide-react';
import { ATHLETE_CHECK_IN_PATH } from '../routerPaths';

export interface AthleteMenuItem {
  label: string;
  to: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

export const athleteMenuItems: AthleteMenuItem[] = [
  { label: 'Inicio', to: '/athlete', icon: Home },
  { label: 'Rutina', to: '/athlete/routine', icon: Dumbbell },
  { label: 'Check-in', to: ATHLETE_CHECK_IN_PATH, icon: ClipboardList },
  { label: 'Carga del día', to: '/athlete/daily-load', icon: Activity },
  { label: 'Progreso', to: '/athlete/progress', icon: BarChart3 },
];

export const athleteUser = {
  name: 'Lucía Martínez',
  role: 'Atleta',
  initials: 'LM',
};
