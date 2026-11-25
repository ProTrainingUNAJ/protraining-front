import { describe, expect, it } from 'vitest';
import {
  buildAthleteToPfMessage,
  buildPfToAthleteAttendanceMessage,
  buildPfToAthleteMessage,
} from './contactTemplates';

describe('contactTemplates', () => {
  it('prioriza enfermedad sobre otros estados', () => {
    const msg = buildPfToAthleteMessage({
      name: 'Lucas Fernández',
      status: 'red',
      isSick: true,
      hasActiveInjury: true,
    });
    expect(msg).toContain('Lucas');
    expect(msg).toContain('malestar');
  });

  it('prioriza lesión activa con zona afectada', () => {
    const msg = buildPfToAthleteMessage({
      name: 'Sofía Gómez',
      status: 'red',
      hasActiveInjury: true,
      affectedMuscle: 'Isquiotibial derecho',
    });
    expect(msg).toContain('Sofía');
    expect(msg).toContain('Isquiotibial derecho');
    expect(msg).toContain('lesión activa');
  });

  it('incluye conflicto de zona cuando hasDayConflict es true', () => {
    const msg = buildPfToAthleteMessage({
      name: 'Mateo Díaz',
      status: 'yellow',
      hasDayConflict: true,
      pains: [{ zone: 'Rodilla izquierda', level: 4 }],
    });
    expect(msg).toContain('Mateo');
    expect(msg).toContain('Rodilla izquierda');
  });

  it('genera plantillas fijas para rojo, amarillo, gris y verde', () => {
    expect(buildPfToAthleteMessage({ name: 'Ana Ruiz', status: 'red' })).toContain('rojo');
    expect(buildPfToAthleteMessage({ name: 'Ana Ruiz', status: 'yellow' })).toContain('amarillo');
    expect(buildPfToAthleteMessage({ name: 'Ana Ruiz', status: 'gray' })).toContain(
      'todavía no veo tu check-in',
    );
    expect(buildPfToAthleteMessage({ name: 'Ana Ruiz', status: 'green' })).toContain('verde');
  });

  it('genera plantilla fija para atleta hacia PF', () => {
    expect(buildAthleteToPfMessage('Lucas')).toContain('soy Lucas');
    expect(buildAthleteToPfMessage()).toContain('ProTraining');
  });

  it('genera plantilla de asistencia para atleta ausente invitándolo a completar la rutina', () => {
    const msg = buildPfToAthleteAttendanceMessage('Joaquín Díaz', false);
    expect(msg).toBe(
      'Hola Joaquín, todavía no registraste tu entrenamiento de hoy en ProTraining. Acordate de completar tu rutina para que se tome el presente en la sesión.',
    );
  });

  it('genera plantilla de asistencia para atleta presente felicitándolo por su sesión', () => {
    const msg = buildPfToAthleteAttendanceMessage('Lucas Gómez', true);
    expect(msg).toBe(
      'Hola Lucas, vi que ya registraste tu carga de hoy en ProTraining. ¡Excelente sesión!',
    );
  });
});
