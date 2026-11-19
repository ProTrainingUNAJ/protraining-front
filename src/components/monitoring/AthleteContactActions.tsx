import React, { useState } from 'react';
import { Check, Copy, MessageCircle, Send } from 'lucide-react';
import { copyTextToClipboard } from '../../utils/clipboard';
import { buildPfToAthleteMessage } from '../../utils/contactTemplates';
import { buildTelegramLink } from '../../utils/telegram';
import { buildWhatsAppLink } from '../../utils/whatsapp';
import type { AthleteTrafficLightItem } from './trafficLight.types';

export interface AthleteContactActionsProps {
  athlete: AthleteTrafficLightItem;
  compact?: boolean;
}

export const AthleteContactActions: React.FC<AthleteContactActionsProps> = ({
  athlete,
  compact = false,
}) => {
  const [telegramFeedback, setTelegramFeedback] = useState<'idle' | 'copied' | 'manual'>('idle');

  const message = buildPfToAthleteMessage(athlete);
  const whatsappLink = buildWhatsAppLink(athlete.phone, message);
  const telegramLink = buildTelegramLink(athlete.telegramUsername);

  const handleTelegramClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    const copied = await copyTextToClipboard(message);
    setTelegramFeedback(copied ? 'copied' : 'manual');
  };

  if (!whatsappLink && !telegramLink) {
    return (
      <span
        style={{
          fontSize: compact ? '0.72rem' : '0.8rem',
          color: 'var(--text-muted)',
          fontWeight: 600,
        }}
      >
        Sin canales de contacto
      </span>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        width: compact ? '100%' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          flexWrap: 'wrap',
        }}
      >
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="btn btn-secondary"
            aria-label={`Contactar a ${athlete.name} por WhatsApp`}
            title="Contactar por WhatsApp con mensaje prellenado"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: compact ? '0.35rem 0.6rem' : '0.55rem 0.9rem',
              fontSize: compact ? '0.76rem' : '0.82rem',
              fontWeight: 700,
              flex: compact ? 1 : undefined,
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={compact ? 14 : 15} aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
        )}

        {telegramLink && (
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTelegramClick}
            className="btn btn-secondary"
            aria-label={`Contactar a ${athlete.name} por Telegram`}
            title="Abrir chat en Telegram y copiar mensaje sugerido"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: compact ? '0.35rem 0.6rem' : '0.55rem 0.9rem',
              fontSize: compact ? '0.76rem' : '0.82rem',
              fontWeight: 700,
              flex: compact ? 1 : undefined,
              justifyContent: 'center',
            }}
          >
            <Send size={compact ? 14 : 15} aria-hidden="true" />
            <span>Telegram</span>
          </a>
        )}
      </div>

      {telegramFeedback === 'copied' && (
        <div
          role="status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.75rem',
            color: '#15803d',
            fontWeight: 600,
          }}
        >
          <Check size={13} aria-hidden="true" />
          <span>Mensaje copiado al portapapeles para pegar en Telegram.</span>
        </div>
      )}

      {telegramFeedback === 'manual' && (
        <div
          role="status"
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-main)',
            background: 'var(--bg-subtle)',
            padding: '0.45rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Copy size={13} aria-hidden="true" />
            <span>Copiá este mensaje manualmente para Telegram:</span>
          </div>
          <textarea
            readOnly
            aria-label={`Mensaje manual para ${athlete.name}`}
            value={message}
            rows={2}
            style={{
              width: '100%',
              fontSize: '0.75rem',
              padding: '0.3rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      )}
    </div>
  );
};
