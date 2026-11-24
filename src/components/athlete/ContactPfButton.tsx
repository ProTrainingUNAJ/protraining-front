import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Solo WhatsApp
  if (whatsappLink && !telegramLink) {
    return (
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-secondary ${className}`.trim()}
        title="Contactar a mi preparador físico por WhatsApp"
        aria-label="Contactar a mi PF"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ProfileAvatar src={pfPhotoUrl} name="Preparador Físico" size={24} />
        <WhatsAppIcon size={18} aria-hidden="true" />
        <span className="contact-pf-label">Contactar a mi PF</span>
      </a>
    );
  }

  // Solo Telegram
  if (!whatsappLink && telegramLink) {
    return (
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          gap: '0.35rem',
        }}
      >
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTelegramClick}
          className={`btn btn-secondary ${className}`.trim()}
          title="Contactar a mi preparador físico por Telegram (copia el mensaje para pegar)"
          aria-label="Contactar a mi preparador por Telegram"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ProfileAvatar src={pfPhotoUrl} name="Preparador Físico" size={24} />
          <TelegramIcon size={18} aria-hidden="true" />
          <span className="contact-pf-label">Contactar por Telegram</span>
        </a>
        {telegramFeedback !== 'idle' && (
          <div
            role="status"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.35rem',
              zIndex: 40,
              minWidth: '240px',
              padding: '0.65rem 0.75rem',
              borderRadius: '0.5rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '0.8rem',
              color: 'var(--text-main)',
            }}
          >
            {telegramFeedback === 'copied' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--success-text)',
                  fontWeight: 600,
                }}
              >
                <Check size={14} aria-hidden="true" />
                Mensaje copiado al portapapeles para pegar en Telegram.
              </span>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  <Copy size={14} aria-hidden="true" />
                  Copiá este mensaje manualmente para Telegram:
                </div>
                <textarea
                  readOnly
                  aria-label="Mensaje para copiar manualmente"
                  value={message}
                  rows={2}
                  style={{
                    width: '100%',
                    fontSize: '0.78rem',
                    padding: '0.3rem',
                    borderRadius: '0.35rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Ambos canales disponibles
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={`btn btn-secondary ${className}`.trim()}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Contactar a mi PF"
        onClick={() => setMenuOpen((prev) => !prev)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ProfileAvatar src={pfPhotoUrl} name="Preparador Físico" size={24} />
        <WhatsAppIcon size={18} aria-hidden="true" />
        <span className="contact-pf-label">Contactar a mi PF</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.35rem',
            zIndex: 50,
            minWidth: '250px',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {whatsappLink && (
            <a
              role="menuitem"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', gap: '0.5rem', width: '100%' }}
            >
              <WhatsAppIcon size={16} aria-hidden="true" />
              WhatsApp
            </a>
          )}
          {telegramLink && (
            <a
              role="menuitem"
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTelegramClick}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', gap: '0.5rem', width: '100%' }}
            >
              <TelegramIcon size={16} aria-hidden="true" />
              Telegram
            </a>
          )}
          {telegramFeedback === 'copied' && (
            <div
              role="status"
              style={{
                fontSize: '0.78rem',
                color: 'var(--success-text)',
                padding: '0.25rem 0.4rem',
              }}
            >
              Mensaje copiado al portapapeles para pegar en Telegram.
            </div>
          )}
          {telegramFeedback === 'manual' && (
            <div
              role="status"
              style={{ fontSize: '0.78rem', color: 'var(--text-main)', padding: '0.25rem 0.4rem' }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                Copiá este mensaje manualmente:
              </div>
              <textarea
                readOnly
                aria-label="Mensaje para copiar manualmente"
                value={message}
                rows={2}
                style={{
                  width: '100%',
                  fontSize: '0.75rem',
                  padding: '0.25rem',
                  borderRadius: '0.35rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
