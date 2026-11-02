import { describe, expect, it } from 'vitest';
import { detectCsvDelimiter, matchColumn, parseCsvHeader } from '../csv';

describe('csv', () => {
  it('detects the delimiter used by the header', () => {
    expect(detectCsvDelimiter('Atleta,Peso\nLucas,100')).toBe(',');
    expect(detectCsvDelimiter('Atleta;Peso\nLucas;100')).toBe(';');
  });

  it('parses the header ignoring BOM and trimmed spaces', () => {
    expect(parseCsvHeader('\uFEFFAtleta, Ejercicio ,Peso\nLucas,Sentadilla,100')).toEqual([
      'Atleta',
      'Ejercicio',
      'Peso',
    ]);
  });

  it('parses quoted headers with commas and semicolons', () => {
    expect(parseCsvHeader('"Atleta","Peso (kg)","Fecha; marca"\nLucas,100,2026-10-30')).toEqual([
      'Atleta',
      'Peso (kg)',
      'Fecha; marca',
    ]);
  });

  it('throws when the file has no header', () => {
    expect(() => parseCsvHeader('')).toThrow('El archivo CSV está vacío.');
    expect(() => parseCsvHeader('\r\nAtleta,Peso\r\n')).toThrow('El archivo CSV está vacío.');
  });

  it('matches columns by exact or partial name without accents or case', () => {
    expect(matchColumn(['Atleta', 'Ejercicio', 'Peso'], ['atleta'])).toBe('Atleta');
    expect(matchColumn(['Fecha de la marca'], ['fecha'])).toBe('Fecha de la marca');
    expect(matchColumn(['Peso (kg)'], ['peso'])).toBe('Peso (kg)');
    expect(matchColumn(['Otra columna'], ['peso'])).toBe('');
  });
});
