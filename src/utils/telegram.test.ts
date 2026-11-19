import { describe, expect, it } from 'vitest';
import {
  buildTelegramLink,
  normalizeTelegramUsername,
  validateTelegramUsername,
} from './telegram';

describe('telegram utils', () => {
  it('normaliza usernames válidos con o sin @ y espacios', () => {
    expect(normalizeTelegramUsername('@profe_juan')).toBe('profe_juan');
    expect(normalizeTelegramUsername('  profe_juan  ')).toBe('profe_juan');
    expect(normalizeTelegramUsername('Atleta_2026')).toBe('Atleta_2026');
  });

  it('devuelve null para usernames vacíos o inválidos', () => {
    expect(normalizeTelegramUsername(null)).toBeNull();
    expect(normalizeTelegramUsername('')).toBeNull();
    expect(normalizeTelegramUsername('   ')).toBeNull();
    expect(normalizeTelegramUsername('abcd')).toBeNull();
    expect(normalizeTelegramUsername('@@profe_juan')).toBeNull();
    expect(normalizeTelegramUsername('profe-juan')).toBeNull();
  });

  it('valida y devuelve mensajes en español para errores', () => {
    expect(validateTelegramUsername(null)).toBeNull();
    expect(validateTelegramUsername('')).toBeNull();
    expect(validateTelegramUsername('@profe_juan')).toBeNull();
    expect(validateTelegramUsername('@@profe')).toContain("múltiples '@'");
    expect(validateTelegramUsername('abcd')).toContain('entre 5 y 32 caracteres');
    expect(validateTelegramUsername('profe-juan')).toContain('letras, números y guión bajo');
  });

  it('construye enlaces https://t.me/<username> sin @', () => {
    expect(buildTelegramLink('@profe_juan')).toBe('https://t.me/profe_juan');
    expect(buildTelegramLink('profe_juan')).toBe('https://t.me/profe_juan');
    expect(buildTelegramLink('ab')).toBeNull();
    expect(buildTelegramLink(null)).toBeNull();
  });
});
