import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { usersService } from '../../api/users';
import { buildWhatsAppLink } from '../../utils/whatsapp';

export interface ContactPfButtonProps {
  className?: string;
  initialText?: string;
}

export const ContactPfButton: React.FC<ContactPfButtonProps> = ({
  className = '',
  initialText = 'Hola profe, te escribo desde ProTraining.',
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPfContact() {
      try {
        const contact = await usersService.getPfContact();
        if (isMounted) {
          setPhoneNumber(contact?.phoneNumber ?? null);
        }
      } catch {
        if (isMounted) {
          setPhoneNumber(null);
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

  // Criterio de aceptación KAN-562:
  // Si está cargando o si el PF NO tiene número cargado, el botón no se muestra
  if (isLoading || !phoneNumber) {
    return null;
  }

  const link = buildWhatsAppLink(phoneNumber, initialText);
  if (!link) {
    return null;
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn btn-secondary ${className}`.trim()}
      title="Contactar a mi preparador físico por WhatsApp"
      aria-label="Contactar a mi preparador"
    >
      <MessageCircle size={18} aria-hidden="true" />
      <span>Contactar a mi preparador</span>
    </a>
  );
};
