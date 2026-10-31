import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink } from '../whatsapp';

describe('buildWhatsAppLink (KAN-562)', () => {
  it('devuelve null si el número es nulo, indefinido o vacío', () => {
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink(undefined)).toBeNull();
    expect(buildWhatsAppLink('')).toBeNull();
    expect(buildWhatsAppLink('   ')).toBeNull();
  });

  it('devuelve null si el número no contiene dígitos', () => {
    expect(buildWhatsAppLink('abc-+-')).toBeNull();
  });

  it('limpia espacios, guiones y signos más dejando solo dígitos en wa.me', () => {
    const link = buildWhatsAppLink('+54 9 11 2345-6789');
    expect(link).toBe('https://wa.me/5491123456789');
  });

  it('codifica el mensaje inicial con encodeURIComponent en el parámetro ?text=', () => {
    const link = buildWhatsAppLink('5491123456789', 'Hola profe, ¿cómo estás?');
    expect(link).toBe(
      'https://wa.me/5491123456789?text=Hola%20profe%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F',
    );
  });

  it('ignora texto inicial con solo espacios y devuelve el enlace base', () => {
    const link = buildWhatsAppLink('5491123456789', '   ');
    expect(link).toBe('https://wa.me/5491123456789');
  });
});
