import React, { useState } from 'react';
import { Bell } from 'lucide-react';

export const NotificationsButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="shell-notifications-wrap">
      <button
        type="button"
        className="shell-icon-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        title="Notificaciones"
        aria-expanded={open}
      >
        <Bell size={20} aria-hidden="true" />
      </button>

      {open && (
        <div className="shell-popover" role="region" aria-label="Panel de notificaciones">
          <div className="shell-popover-header">
            <strong>Notificaciones</strong>
          </div>
          <div className="shell-popover-body">
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              No hay notificaciones pendientes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
