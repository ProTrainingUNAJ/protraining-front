import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MonitoringPage } from '../MonitoringPage';
import { structureService } from '../../../api/structureService';
import {
  getCategoryTrafficLightToday,
  getCategoryAttendanceToday,
} from '../../../api/seguimientoService';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
    getAthletes: vi.fn(),
    getAthletePhotoUrl: vi.fn(
      (id: string) => `http://localhost/api/estructura/api/v1/athletes/${id}/photo`,
    ),
  },
}));

vi.mock('../../../api/users', () => ({
  usersService: {
    getMyPhotoUrl: vi.fn((id: string) => `http://localhost/api/identidad/api/v1/users/${id}/photo`),
  },
}));

vi.mock('../../../api/seguimientoService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/seguimientoService')>();
  return {
    ...actual,
    getCategoryTrafficLightToday: vi.fn(),
    getCategoryAttendanceToday: vi.fn(),
    setAttendance: vi.fn(),
  };
});

describe('MonitoringPage · Pestaña Asistencia con Carga del Día y Avatar (KAN-512)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(structureService.getOrganizations).mockResolvedValue([
      { id: 'org-1', name: 'Club Atlético', categoriesCount: 1 },
    ]);
    vi.mocked(structureService.getCategories).mockResolvedValue([
      { id: 'cat-1', name: 'Primera División', organizationId: 'org-1', athletesCount: 2 },
    ]);
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      {
        id: 'ath-1',
        accountId: 'acc-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'lucas@correo.com',
        phone: '1150000001',
        hasPhoto: true,
        photoUpdatedAt: '2026-11-15T12:00:00Z',
      },
      {
        id: 'ath-2',
        accountId: 'acc-2',
        firstName: 'Joaquín',
        lastName: 'Díaz',
        fullName: 'Joaquín Díaz',
        email: 'joaquin@correo.com',
        phone: '1150000002',
        hasPhoto: false,
      },
    ] as unknown as import('../../../types/structure').Athlete[]);

    vi.mocked(getCategoryTrafficLightToday).mockResolvedValue([]);
    vi.mocked(getCategoryAttendanceToday).mockResolvedValue({
      categoryId: 'cat-1',
      date: '2026-11-15',
      totalRoster: 2,
      presentCount: 1,
      attendancePercentage: 50,
      athletes: [
        {
          athleteId: 'ath-1',
          athleteName: 'Lucas Gómez',
          status: 'Present',
          totalMinutes: 60,
          totalLoad: 180,
          activities: [
            {
              type: 'Gym',
              name: 'Gimnasio',
              minutes: 60,
              rpe: 3,
            },
          ],
        },
        {
          athleteId: 'ath-2',
          athleteName: 'Joaquín Díaz',
          status: 'NoRecord',
          totalMinutes: 0,
          totalLoad: 0,
          activities: [],
        },
      ],
    });
  });

  it('muestra avatar, tiempo total, carga acumulada y chips de actividades en la tarjeta del atleta presente', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Cambiar a la pestaña Asistencia
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Asistencia/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Asistencia/i }));

    // Verificar atleta presente con métricas
    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByText('60')).toBeDefined();
      expect(screen.getByText('180')).toBeDefined();
      expect(screen.getByText('Tiempo Total')).toBeDefined();
      expect(screen.getByText('Carga Acumulada')).toBeDefined();
      expect(screen.getByText(/Gimnasio:/i)).toBeDefined();
      expect(screen.getByText(/RPE 3/i)).toBeDefined();
    });

    // Verificar atleta sin registro
    expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    expect(screen.getByText(/Sin carga registrada hoy/i)).toBeDefined();

    // Verificar avatares accesibles presentes
    expect(screen.getByLabelText(/Foto de perfil de Lucas Gómez/i)).toBeDefined();
    expect(screen.getByLabelText(/Foto de perfil de Joaquín Díaz/i)).toBeDefined();
  });
});
