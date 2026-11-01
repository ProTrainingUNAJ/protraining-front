import { afterEach, describe, expect, it } from 'vitest';
import { configureApiClients } from '../clients';
import { confirmRecordsImport, previewRecordsImport } from '../generated/entrenamiento';

// XHR falso para inspeccionar exactamente qué manda Axios al adapter real.
// Necesario porque el bug de KAN-390 (415) solo se ve en el request final:
// un Content-Type JSON hacía que Axios serializara el FormData como JSON.
interface CapturedRequest {
  headers: Record<string, string>;
  body: unknown;
}

class FakeXHR {
  static captures: CapturedRequest[] = [];

  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  status = 200;
  statusText = 'OK';
  responseText = '[]';
  response: unknown = [];
  responseType = '';
  readyState = 4;
  timeout = 0;
  withCredentials = false;
  upload = { addEventListener: () => undefined };

  private headers: Record<string, string> = {};

  open() {}

  abort() {}

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  getAllResponseHeaders() {
    return 'content-type: application/json';
  }

  send(body: unknown) {
    FakeXHR.captures.push({ headers: { ...this.headers }, body });
    setTimeout(() => this.onloadend?.(), 0);
  }
}

const RealXHR = globalThis.XMLHttpRequest;

configureApiClients();

afterEach(() => {
  globalThis.XMLHttpRequest = RealXHR;
  FakeXHR.captures = [];
});

function useFakeXhr() {
  globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
}

function lastRequest(): CapturedRequest {
  const request = FakeXHR.captures.at(-1);
  if (!request) throw new Error('No se envió ningún request');
  return request;
}

describe('importación de récords y content-type', () => {
  it('manda el preview como multipart/form-data (sin Content-Type JSON)', async () => {
    useFakeXhr();

    await previewRecordsImport({
      body: {
        file: new File(['Atleta,Peso\nLucas,100'], 'records.csv', { type: 'text/csv' }),
        athleteColumn: 'Atleta',
        exerciseColumn: 'Ejercicio',
        weightColumn: 'Peso',
      },
    });

    const request = lastRequest();
    expect(request.body).toBeInstanceOf(FormData);
    // El browser completa el header con el boundary; si lo forzamos, falla el parseo.
    expect(request.headers['Content-Type']).toBeUndefined();
  });

  it('manda la confirmación como application/json', async () => {
    useFakeXhr();

    await confirmRecordsImport({
      body: {
        rows: [
          {
            athleteId: 'ath-1',
            exerciseId: 'ex-1',
            weightOneRepMaxKg: 100,
          },
        ],
      },
    });

    const request = lastRequest();
    expect(request.headers['Content-Type']).toBe('application/json');
    expect(typeof request.body).toBe('string');
  });
});
