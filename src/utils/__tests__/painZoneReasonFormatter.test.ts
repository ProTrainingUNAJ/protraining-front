import { describe, expect, it } from 'vitest';
import { formatAlertReason } from '../painZoneReasonFormatter';

describe('formatAlertReason (KAN-631)', () => {
  it('traduce listas crudas de zonas musculares, articulaciones y lesión activa sin Nivel 6', () => {
    const rawReason =
      'Riesgo de lesión inminente: el atleta reporta lesión activa o molestia aguda en zona: abdominales:1,biceps_izquierdo:6,pecho_derecho:5,rodilla_derecha:3 en sus check-ins recientes.';

    expect(formatAlertReason(rawReason)).toBe(
      'Riesgo de lesión inminente: el atleta reporta lesión activa o molestia aguda en zona: Abdominales [Nivel 1], Bíceps izquierdo [Lesión activa], Pecho derecho [Nivel 5], Rodilla derecha [Nivel 3] en sus check-ins recientes.',
    );
  });

  it('traduce IDs clínicos sin lateralidad heredados de la ficha médica', () => {
    const rawReason = 'Lesión en zona: isquiotibiales:6,cuadriceps:2,lumbar:4,rodilla:3.';

    expect(formatAlertReason(rawReason)).toBe(
      'Lesión en zona: Isquiotibiales [Lesión activa], Cuádriceps [Nivel 2], Lumbar [Nivel 4], Rodilla [Nivel 3].',
    );
  });

  it('formatea IDs en snake_case desconocidos capitalizando el texto', () => {
    expect(formatAlertReason('Molestia en zona: tendon_rotuliano:4.')).toBe(
      'Molestia en zona: Tendon rotuliano [Nivel 4].',
    );
  });

  it('no modifica métricas ni textos con dos puntos fuera de "en zona: "', () => {
    expect(formatAlertReason('Riesgo elevado: ACWR:1.3 en los últimos días.')).toBe(
      'Riesgo elevado: ACWR:1.3 en los últimos días.',
    );
    expect(formatAlertReason('Controlar Cuádriceps:6 antes de entrenar.')).toBe(
      'Controlar Cuádriceps:6 antes de entrenar.',
    );
  });

  it('mantiene intacto un motivo ya formateado desde el backend o sin zonas', () => {
    const alreadyFormatted =
      'Riesgo de lesión inminente: el atleta reporta lesión activa o molestia aguda en zona: Bíceps izquierdo [Lesión activa], Pecho derecho [Nivel 5] en sus check-ins recientes.';

    expect(formatAlertReason(alreadyFormatted)).toBe(alreadyFormatted);
    expect(formatAlertReason('Sobrecarga aguda sostenida: 3 sesiones con RPE >= 8.')).toBe(
      'Sobrecarga aguda sostenida: 3 sesiones con RPE >= 8.',
    );
    expect(formatAlertReason('')).toBe('');
  });
});
