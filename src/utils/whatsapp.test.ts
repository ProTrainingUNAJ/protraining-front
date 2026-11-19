import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink } from './whatsapp';

describe('whatsapp utils', () => {
  it('construye enlace wa.me solo con dígitos y texto codificado', () => {
    expect(buildWhatsAppLink('+54 9 11 2345-6789', 'Hola Lucas')).toBe(
      'https://wa.me/5491123456789?text=Hola%20Lucas',
    );
  });

  it('construye enlace sin query text cuando no hay mensaje', () => {
    expect(buildWhatsAppLink('5491123456789')).toBe('https://wa.me/5491123456789');
  });

  it('retorna null cuando el teléfono está vacío o no tiene dígitos', () => {
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink('')).toBeNull();
    expect(buildWhatsAppLink('abc')).toBeNull();
  });
});
