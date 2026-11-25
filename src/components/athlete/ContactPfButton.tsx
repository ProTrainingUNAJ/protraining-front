import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { getStoredSession } from '../../api/axiosClient';
import { usersService } from '../../api/users';
import { copyTextToClipboard } from '../../utils/clipboard';
import { buildAthleteToPfMessage } from '../../utils/contactTemplates';
import { buildTelegramLink } from '../../utils/telegram';
import { buildWhatsAppLink } from '../../utils/whatsapp';
import { TelegramIcon, WhatsAppIcon } from '../common/BrandIcons';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface ContactPfButtonProps {
  className?: string;
  initialText?: string;
}

export const ContactPfButton: React.FC<ContactPfButtonProps> = ({
  className = '',
  initialText,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [telegramFeedback, setTelegramFeedback] = useState<'idle' | 'copied' | 'manual'>('idle');

  useEffect(() => {
    let isMounted = true;

    async function loadPfContact() {
      try {
        const contact = await usersService.getPfContact();
        if (isMounted) {
          setPhoneNumber(contact?.phoneNumber ?? null);
          setTelegramUsername(contact?.telegramUsername ?? null);
        }
      } catch {
        if (isMounted) {
          setPhoneNumber(null);
          setTelegramUsername(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPfContact();

    return () => {
      isMounted = false;
    };
  }, []);

  const session = getStoredSession();
  const message = initialText ?? buildAthleteToPfMessage(session?.user?.fullName);
  const whatsappLink = buildWhatsAppLink(phoneNumber, message);
  const telegramLink = buildTelegramLink(telegramUsername);

  if (isLoading || (!whatsappLink && !telegramLink)) {
    return null;
  }

  const pfPhotoUrl = usersService.getPfPhotoUrl(session?.user?.pfId ?? undefined);

  const handleTelegramClick = async () => {
    const copied = await copyTextToClipboard(message);
    setTelegramFeedback(copied ? 'copied' : 'manual');
  };

  const renderFeedback = () => {
    if (telegramFeedback === 'idle') return null;
    return (
      <div role="status" className="contact-pf-pill-feedback">
        {telegramFeedback === 'copied' ? (
          <span className="contact-pf-feedback-copied">
            <Check size={14} aria-hidden="true" />
            Mensaje copiado al portapapeles para pegar en Telegram.
          </span>
        ) : (
          <div className="contact-pf-feedback-manual">
            <div className="contact-pf-feedback-manual-header">
              <Copy size={14} aria-hidden="true" />
              Copiá este mensaje manualmente para Telegram:
            </div>
            <textarea
              readOnly
              aria-label="Mensaje para copiar manualmente"
              value={message}
              rows={2}
              className="contact-pf-feedback-textarea"
            />
          </div>
        )}
      </div>
    );
  };

  // Solo WhatsApp
  if (whatsappLink && !telegramLink) {
    return (
      <div
        className={`contact-pf-pill ${className}`.trim()}
        role="group"
        aria-label="Contacto con el preparador físico"
      >
        <div className="contact-pf-pill-avatar" title="Preparador Físico">
          <ProfileAvatar src={pfPhotoUrl} name="Preparador Físico" size={26} />
        </div>

        <span className="contact-pf-pill-divider" aria-hidden="true" />

        <a
          href={whatsappLink ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="contact-pf-pill-btn contact-pf-pill-btn--whatsapp"
          title="Contactar a mi preparador físico por WhatsApp"
          aria-label="Contactar a mi PF"
        >
          <WhatsAppIcon size={19} aria-hidden="true" />
          <span className="contact-pf-pill-label">Contactar a mi PF</span>
        </a>
      </div>
    );
  }

  // Solo Telegram
  if (!whatsappLink && telegramLink) {
    return (
      <div
        className={`contact-pf-pill ${className}`.trim()}
        role="group"
        aria-label="Contacto con el preparador físico"
      >
        <div className="contact-pf-pill-avatar" title="Preparador Físico">
          <ProfileAvatar src={pfPhotoUrl} name="Preparador Físico" size={26} />
        </div>

        <span className="contact-pf-pill-divider" aria-hidden="true" />

        <a
          href={telegramLink ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTelegramClick}
          className="contact-pf-pill-btn contact-pf-pill-btn--telegram"
          title="Contactar a mi preparador físico por Telegram (copia el mensaje para pegar)"
          aria-label="Contactar a mi preparador por Telegram"
        >
          <TelegramIcon size={19} aria-hidden="true" />
          <span className="contact-pf-pill-label">Contactar por Telegram</span>
        </a>

        {renderFeedback()}
      </div>
    );
  }

  // Ambos canales disponibles: píldora unificada (Avatar | Logo WA | Logo TG Contactar a mi PF)
  return (
    <div
      className={`contact-pf-pill ${className}`.trim()}
      role="group"
      aria-label="Contacto con el preparador físico"
    >
      <div className="contact-pf-pill-avatar" title="Preparador Físico">
        <ProfileAvatar src={pfPhotoUrl} name="Preparador Físico" size={26} />
      </div>

      <span className="contact-pf-pill-divider" aria-hidden="true" />

      <a
        href={whatsappLink ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="contact-pf-pill-btn contact-pf-pill-btn--whatsapp"
        title="Contactar a mi preparador físico por WhatsApp"
        aria-label="Contactar a mi PF por WhatsApp"
      >
        <WhatsAppIcon size={19} aria-hidden="true" />
      </a>

      <span className="contact-pf-pill-divider" aria-hidden="true" />

      <a
        href={telegramLink ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleTelegramClick}
        className="contact-pf-pill-btn contact-pf-pill-btn--telegram"
        title="Contactar a mi preparador físico por Telegram (copia el mensaje para pegar)"
        aria-label="Contactar a mi PF por Telegram"
      >
        <TelegramIcon size={19} aria-hidden="true" />
      </a>

      <span className="contact-pf-pill-label">Contactar a mi PF</span>

      {renderFeedback()}
    </div>
  );
};
