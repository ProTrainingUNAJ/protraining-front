import type { ComponentType } from 'react';
import { Home, Users, CalendarRange, Dumbbell, Activity, BarChart3, Settings } from 'lucide-react';

export interface CoachMenuItem {
  label: string;
  to: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

export const coachMenuItems: CoachMenuItem[] = [
  { label: 'Inicio', to: '/pf', icon: Home },
  { label: 'Atletas', to: '/pf/athletes', icon: Users },
  { label: 'Planificación', to: '/pf/planning', icon: CalendarRange },
  { label: 'Entrenamiento', to: '/pf/training', icon: Dumbbell },
  { label: 'Seguimiento', to: '/pf/monitoring', icon: Activity },
  { label: 'Informes', to: '/pf/reports', icon: BarChart3 },
  { label: 'Configuración', to: '/pf/settings', icon: Settings },
];

export const coachTabItems: CoachMenuItem[] = coachMenuItems.slice(0, 3);

export const coachUser = {
  name: 'Julián Pérez',
  role: 'Preparador físico',
  initials: 'JP',
};
