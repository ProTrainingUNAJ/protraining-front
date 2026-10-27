import type { ComponentType } from 'react';
import {
  Home,
  Building2,
  Layers,
  Users,
  Calendar,
  CalendarRange,
  Dumbbell,
  Activity,
  BarChart3,
} from 'lucide-react';

export interface CoachMenuItem {
  label: string;
  to: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

export const coachMenuItems: CoachMenuItem[] = [
  { label: 'Inicio', to: '/pf', icon: Home },
  { label: 'Organizaciones', to: '/pf/organizations', icon: Building2 },
  { label: 'Categorías', to: '/pf/categories', icon: Layers },
  { label: 'Atletas', to: '/pf/athletes', icon: Users },
  { label: 'Planificación', to: '/pf/planning', icon: CalendarRange },
  { label: 'Calendario', to: '/pf/calendar', icon: Calendar },
  { label: 'Ejercicios', to: '/pf/training', icon: Dumbbell },
  { label: 'Seguimiento', to: '/pf/monitoring', icon: Activity },
  { label: 'Informes', to: '/pf/reports', icon: BarChart3 },
];

export const coachTabItems: CoachMenuItem[] = [
  coachMenuItems[0],
  coachMenuItems[1],
  coachMenuItems[3],
];

export const coachUser = {
  name: 'Julián Pérez',
  role: 'Preparador físico',
  initials: 'JP',
};
