import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

// Estado vacío de una pantalla o sección: no es un error, explica qué falta y qué hacer
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card card-static empty-state">
      <Icon size={40} className="empty-state-icon" aria-hidden="true" />
      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-desc">{description}</p>
      {action}
    </div>
  );
}
