import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Clock, QrCode, AlertCircle, RefreshCw } from 'lucide-react';
import { categoryInvitationsService } from '../../api/categoryInvitations';
import { CategoryInvitation } from '../../types/structure';
import { formatInvitationExpiration } from '../../utils/argentinaDate';
import '../../styles/invitationModal.css';

export interface CategoryInvitationModalProps {
  categoryId: string;
  categoryName: string;
  onClose: () => void;
}

export function CategoryInvitationModal({
  categoryId,
  categoryName,
  onClose,
}: CategoryInvitationModalProps) {
  const [invitation, setInvitation] = useState<CategoryInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    categoryInvitationsService
      .generate(categoryId)
      .then((data) => {
        if (active) {
          setInvitation(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'No se pudo generar el código de invitación.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [categoryId, reloadKey]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [onClose]);

  const handleCopyLink = async () => {
    if (!invitation?.invitationUrl) return;

    let successful = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(invitation.invitationUrl);
        successful = true;
      } catch {
        successful = false;
      }
    }

    if (!successful && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = invitation.invitationUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        successful = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        successful = false;
      }
    }

    if (successful) {
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="invitation-modal-overlay">
      <div
        className="modal-content invitation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitation-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="invitation-modal-header">
          <div>
            <h2 id="invitation-modal-title" className="invitation-modal-title">
              Invitar Atletas
            </h2>
            <p className="invitation-modal-subtitle">
              Plantel o categoría: <strong>{categoryName}</strong>
            </p>
          </div>
          <button
            type="button"
            className="invitation-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal de invitación"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {loading && (
          <div className="invitation-state-container" role="status">
            <div className="invitation-spinner" aria-hidden="true" />
            <p className="invitation-state-text">Generando código QR y enlace seguro...</p>
          </div>
        )}

        {error && !loading && (
          <div className="invitation-state-container">
            <div className="alert-banner danger invitation-error-banner" role="alert">
              <div className="invitation-error-content">
                <AlertCircle size={20} aria-hidden="true" />
                <span>{error}</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleRetry}>
              <RefreshCw size={16} aria-hidden="true" />
              <span>Reintentar generación</span>
            </button>
          </div>
        )}

        {!loading && !error && invitation && (
          <>
            <div className="invitation-qr-wrapper">
              <div className="invitation-qr-card">
                <QRCodeSVG
                  value={invitation.invitationUrl || ''}
                  size={240}
                  level="Q"
                  includeMargin={true}
                  aria-label={`Código QR para unirse a la categoría ${categoryName}`}
                  role="img"
                />
              </div>
              <p className="invitation-qr-hint">
                <QrCode size={15} aria-hidden="true" />
                <span>Proyectá este código en el vestuario para enrolamiento rápido</span>
              </p>
            </div>

            <div className="invitation-meta">
              <Clock size={16} aria-hidden="true" />
              <span>Vence el {formatInvitationExpiration(invitation.expiresAt)}</span>
            </div>

            <div className="invitation-link-section">
              <label htmlFor="invitation-link-input" className="invitation-link-label">
                Enlace directo para compartir por WhatsApp
              </label>
              <div className="invitation-copy-group">
                <input
                  id="invitation-link-input"
                  type="text"
                  readOnly
                  value={invitation.invitationUrl || ''}
                  className="invitation-link-input"
                  aria-label="URL de invitación a la categoría"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className={`invitation-copy-btn ${copied ? 'copied' : 'default'}`}
                  onClick={handleCopyLink}
                  aria-label={copied ? 'Enlace copiado' : 'Copiar enlace al portapapeles'}
                >
                  {copied ? (
                    <>
                      <Check size={16} aria-hidden="true" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} aria-hidden="true" />
                      <span>Copiar enlace</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="invitation-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <span>Cerrar</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
