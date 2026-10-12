import type { ComponentType } from 'react';
import { Home, Dumbbell, ClipboardList, BarChart3 } from 'lucide-react';

export interface AthleteMenuItem {
  label: string;
  to: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

export const athleteMenuItems: AthleteMenuItem[] = [
  { label: 'Inicio', to: '/athlete', icon: Home },
  { label: 'Rutina', to: '/athlete/routine', icon: Dumbbell },
  { label: 'Check-in', to: '/athlete/check-in', icon: ClipboardList },
  { label: 'Progreso', to: '/athlete/progress', icon: BarChart3 },
];

export const athleteUser = {
  name: 'Lucía Martínez',
  role: 'Atleta',
  initials: 'LM',
};