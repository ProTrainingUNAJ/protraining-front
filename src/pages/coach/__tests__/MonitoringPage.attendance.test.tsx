import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

    // Verificar atleta presente con métricas y sin chips amarillos en la tarjeta
    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByText('60')).toBeDefined();
      expect(screen.getByText('180')).toBeDefined();
      expect(screen.getAllByText('Tiempo Total').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Carga Acumulada').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Carga del día registrada')).toBeDefined();
      // El chip de texto suelto ya no está en la tarjeta
      expect(screen.queryByText(/Gimnasio: 60m/i)).toBeNull();
    });

    // Al hacer clic en la tarjeta o burbuja de Lucas Gómez se abre el detalle en la ficha rápida
    const lucasCard = screen.getByRole('button', {
      name: /ver detalle de asistencia y carga de lucas gómez/i,
    });
    fireEvent.click(lucasCard);

    // En la ficha rápida se ve todo el detalle: minutos, RPE y dónde se hizo
    await waitFor(() => {
      expect(screen.getByText(/Actividades y Carga del Día/i)).toBeDefined();
      expect(screen.getByText('Gimnasio')).toBeDefined();
      expect(screen.getByText('Lugar / Tipo: Gimnasio')).toBeDefined();
      expect(screen.getByText('60 min')).toBeDefined();
      expect(screen.getByText('RPE 3')).toBeDefined();
      expect(screen.getByText('180 UA')).toBeDefined();
    });

    // Cerrar la ficha para continuar
    fireEvent.click(screen.getByLabelText('Cerrar ficha'));

    // Verificar atleta sin registro (muestra métricas en 0 y estado Sin registro)
    const joaquinName = screen.getByText('Joaquín Díaz');
    expect(joaquinName).toBeDefined();
    // KAN-582: el truncado (nowrap + ellipsis) vive en .monitoring-att-name
    expect(joaquinName.className).toContain('monitoring-att-name');
    expect(screen.getAllByText('Sin registro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Marcar presente a Joaquín Díaz/i })).toBeDefined();

    // Verificar avatares accesibles presentes
    expect(screen.getByLabelText(/Foto de perfil de Lucas Gómez/i)).toBeDefined();
    expect(screen.getByLabelText(/Foto de perfil de Joaquín Díaz/i)).toBeDefined();
  });

  it('permite abrir el modal de carga al pulsar "+ Cargar minutos y RPE" en un atleta sin registro (KAN-621)', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Asistencia/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Asistencia/i }));

    await waitFor(() => {
      expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    });

    const loadBtn = screen.getByTestId('load-btn-ath-2');
    expect(loadBtn).toBeDefined();
    fireEvent.click(loadBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByRole('heading', { name: /Carga de Entrenamiento/i })).toBeDefined();
      expect(screen.getAllByText('Joaquín Díaz').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('permite abrir el modal de edición al pulsar "Editar Carga" en un atleta con carga (KAN-621)', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Asistencia/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Asistencia/i }));

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    const editBtn = screen.getByTestId('edit-load-btn-ath-1');
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByRole('heading', { name: /Carga de Entrenamiento/i })).toBeDefined();
      expect(screen.getAllByText('Lucas Gómez').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('permite filtrar reactivamente a los atletas por Presentes, Sin registro y búsqueda por texto (KAN-621)', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Asistencia/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Asistencia/i }));

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    });

    // 1. Filtrar solo presentes
    const presentesBtn = screen.getByTestId('filter-attendance-present');
    expect(presentesBtn).toBeDefined();
    fireEvent.click(presentesBtn);

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.queryByText('Joaquín Díaz')).toBeNull();
    });

    // 2. Filtrar sin registro
    const sinRegistroBtn = screen.getByTestId('filter-attendance-absent');
    expect(sinRegistroBtn).toBeDefined();
    fireEvent.click(sinRegistroBtn);

    await waitFor(() => {
      expect(screen.queryByText('Lucas Gómez')).toBeNull();
      expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    });

    // 3. Volver a todos
    const todosBtn = screen.getByTestId('filter-attendance-all');
    fireEvent.click(todosBtn);

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    });
  });

  it('muestra la barra de resumen de readiness y bienestar diario con el conteo de check-ins y botón actualizar (KAN-621)', async () => {
    vi.mocked(getCategoryTrafficLightToday).mockResolvedValue([
      {
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        trafficLight: 'Green',
        hasReportedToday: true,
        resultValue: 90,
        trafficLightReason: 'Óptimo',
        reportedAt: '2026-11-17T08:00:00Z',
      },
      {
        athleteId: 'ath-2',
        athleteName: 'Joaquín Díaz',
        trafficLight: 'Yellow',
        hasReportedToday: false,
        resultValue: 50,
        trafficLightReason: 'Sin reporte',
      },
    ]);

    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Semáforo de Readiness y Bienestar Diario')).toBeDefined();
      expect(screen.getByText(/1 \/ 2 check-ins completados \(50\.0%\)/i)).toBeDefined();
      expect(screen.getByTestId('refresh-traffic-light-btn')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('refresh-traffic-light-btn'));

    await waitFor(() => {
      expect(getCategoryTrafficLightToday).toHaveBeenCalled();
    });
  });

  it('abre directamente la pestaña de Asistencia & RPE cuando la URL tiene ?tab=attendance (KAN-621)', async () => {
    vi.mocked(getCategoryAttendanceToday).mockResolvedValue({
      categoryId: 'cat-1',
      date: '2026-11-15',
      totalRoster: 1,
      presentCount: 1,
      attendancePercentage: 100,
      athletes: [
        {
          athleteId: 'ath-1',
          athleteName: 'Lucas Gómez',
          status: 'Present',
          totalMinutes: 140,
          totalLoad: 850,
          activities: [],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Planilla de Asistencia Diaria')).toBeDefined();
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });
  });

  it('no muestra botón de asistencia en las tarjetas de la pestaña Semáforo (KAN-621)', async () => {
    vi.mocked(getCategoryTrafficLightToday).mockResolvedValue([
      {
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        trafficLight: 'Green',
        hasReportedToday: true,
        recommendation: 'Apto para carga completa.',
      } as unknown as import('../../../api/generated/seguimiento').AthleteTrafficLightSummary,
    ]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // En la pestaña del Semáforo debe renderizar la tarjeta y NO tener botón de tilde
    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    expect(screen.queryByTestId('btn-attendance-check-ath-1')).toBeNull();
    expect(screen.queryByTestId('btn-attendance-toggle-ath-1')).toBeNull();
  });

  it('permite conmutar la presencia del atleta con el botón vertical de tilde en Asistencia & RPE', async () => {
    const { setAttendance } = await import('../../../api/seguimientoService');

    vi.mocked(getCategoryAttendanceToday).mockResolvedValue({
      categoryId: 'cat-1',
      date: '2026-11-15',
      totalRoster: 1,
      presentCount: 0,
      attendancePercentage: 0,
      athletes: [
        {
          athleteId: 'ath-1',
          athleteName: 'Lucas Gómez',
          status: 'NoRecord',
          totalMinutes: 0,
          totalLoad: 0,
          activities: [],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByTestId('btn-attendance-toggle-ath-1')).toBeDefined();
    });

    const toggleBtn = screen.getByTestId('btn-attendance-toggle-ath-1');
    expect(toggleBtn.getAttribute('title')).toBe('Marcar presente');

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(setAttendance).toHaveBeenCalledWith('ath-1', true);
      expect(toggleBtn.getAttribute('title')).toBe('Presente (clic para quitar)');
    });
  });

  it('en pestaña Asistencia, abre ficha rápida de atleta sin check-in con solo WhatsApp (KAN-503)', async () => {
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      {
        id: 'ath-2',
        accountId: 'acc-2',
        firstName: 'Joaquín',
        lastName: 'Díaz',
        fullName: 'Joaquín Díaz',
        email: 'joaquin@correo.com',
        phone: '+54 9 11 5000-0002',
        telegramUsername: null,
        hasPhoto: false,
      },
    ] as unknown as import('../../../types/structure').Athlete[]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const card = await screen.findByLabelText(/Ver detalle de asistencia y carga de Joaquín Díaz/i);
    fireEvent.click(card);

    const dialog = await screen.findByRole('dialog');
    const wa = await within(dialog).findByRole('link', {
      name: /Contactar a Joaquín Díaz por WhatsApp/i,
    });
    expect(wa.getAttribute('href')).toContain('https://wa.me/5491150000002?text=');
    expect(
      within(dialog).queryByRole('link', { name: /Contactar a Joaquín Díaz por Telegram/i }),
    ).toBeNull();
  });

  it('en pestaña Asistencia, abre ficha rápida de atleta sin check-in con solo Telegram (KAN-503)', async () => {
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      {
        id: 'ath-2',
        accountId: 'acc-2',
        firstName: 'Joaquín',
        lastName: 'Díaz',
        fullName: 'Joaquín Díaz',
        email: 'joaquin@correo.com',
        phone: '',
        telegramUsername: '@joaquin_diaz',
        hasPhoto: false,
      },
    ] as unknown as import('../../../types/structure').Athlete[]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const card = await screen.findByLabelText(/Ver detalle de asistencia y carga de Joaquín Díaz/i);
    fireEvent.click(card);

    const dialog = await screen.findByRole('dialog');
    const tg = await within(dialog).findByRole('link', {
      name: /Contactar a Joaquín Díaz por Telegram/i,
    });
    expect(tg.getAttribute('href')).toBe('https://t.me/joaquin_diaz');
    expect(
      within(dialog).queryByRole('link', { name: /Contactar a Joaquín Díaz por WhatsApp/i }),
    ).toBeNull();
  });

  it('en pestaña Asistencia, abre ficha rápida de atleta sin check-in con ambos canales (KAN-503)', async () => {
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      {
        id: 'ath-2',
        accountId: 'acc-2',
        firstName: 'Joaquín',
        lastName: 'Díaz',
        fullName: 'Joaquín Díaz',
        email: 'joaquin@correo.com',
        phone: '+54 9 11 5000-0002',
        telegramUsername: 'joaquin_diaz',
        hasPhoto: false,
      },
    ] as unknown as import('../../../types/structure').Athlete[]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const card = await screen.findByLabelText(/Ver detalle de asistencia y carga de Joaquín Díaz/i);
    fireEvent.click(card);

    const dialog = await screen.findByRole('dialog');
    const wa = await within(dialog).findByRole('link', {
      name: /Contactar a Joaquín Díaz por WhatsApp/i,
    });
    expect(wa.getAttribute('href')).toContain('https://wa.me/5491150000002?text=');
    const tg = within(dialog).getByRole('link', { name: /Contactar a Joaquín Díaz por Telegram/i });
    expect(tg.getAttribute('href')).toBe('https://t.me/joaquin_diaz');
  });

  it('en pestaña Asistencia, muestra Sin canales de contacto si atleta sin check-in no tiene teléfono ni Telegram (KAN-503)', async () => {
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      {
        id: 'ath-2',
        accountId: 'acc-2',
        firstName: 'Joaquín',
        lastName: 'Díaz',
        fullName: 'Joaquín Díaz',
        email: 'joaquin@correo.com',
        phone: '',
        telegramUsername: null,
        hasPhoto: false,
      },
    ] as unknown as import('../../../types/structure').Athlete[]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const card = await screen.findByLabelText(/Ver detalle de asistencia y carga de Joaquín Díaz/i);
    fireEvent.click(card);

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/Sin canales de contacto/i)).toBeTruthy();
  });

  it('en tarjetas de Asistencia & RPE usa mensaje de ausente para quien no registró entrenamiento y de felicitación para quien está presente (KAN-503)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const absentCard = await screen.findByLabelText(
      /Ver detalle de asistencia y carga de Joaquín Díaz/i,
    );
    const presentCard = await screen.findByLabelText(
      /Ver detalle de asistencia y carga de Lucas Gómez/i,
    );

    const absentWaLinks = within(absentCard).getAllByRole('link', {
      name: /Contactar a Joaquín Díaz por WhatsApp/i,
    });
    expect(absentWaLinks).toHaveLength(1);
    const absentHref = decodeURIComponent(absentWaLinks[0].getAttribute('href') ?? '');
    expect(absentHref).toContain('todavía no registraste tu entrenamiento de hoy');
    expect(absentHref).toContain('para que se tome el presente');

    const presentWaLinks = within(presentCard).getAllByRole('link', {
      name: /Contactar a Lucas Gómez por WhatsApp/i,
    });
    expect(presentWaLinks).toHaveLength(1);
    const presentHref = decodeURIComponent(presentWaLinks[0].getAttribute('href') ?? '');
    expect(presentHref).toContain('vi que ya registraste tu carga de hoy en ProTraining');
    expect(presentHref).toContain('¡Excelente sesión!');
  });

  it('mantiene sin regresiones el mensaje de Semáforo en la pestaña Semáforo del Día (KAN-503)', async () => {
    vi.mocked(getCategoryTrafficLightToday).mockResolvedValue([
      {
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasReportedToday: true,
        trafficLight: 'Red',
        trafficLightReason: 'Bajar carga',
        resultValue: 20,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const wa = await screen.findByRole('link', { name: /Contactar a Lucas Gómez por WhatsApp/i });
    const href = decodeURIComponent(wa.getAttribute('href') ?? '');
    expect(href).toContain('check-in de hoy en rojo');
  });

  it('en Asistencia & RPE y Semáforo, atleta menor con tutor contacta al tutor y sin teléfono de tutor muestra mensaje exacto (KAN-503)', async () => {
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      {
        id: 'ath-1',
        accountId: 'acc-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'lucas@correo.com',
        phone: '+54 9 11 9999-1111',
        telegramUsername: 'lucas_menor',
        isMinor: true,
        guardianConsent: {
          isSigned: true,
          consentDate: '2026-10-01T00:00:00Z',
          isMinor: true,
          guardianName: 'Carlos Gómez',
          guardianPhone: '+54 9 11 4444-1111',
          allowsPhysicalTraining: true,
          allowsHabitsRecommendations: false,
        },
        hasPhoto: false,
      },
      {
        id: 'ath-2',
        accountId: 'acc-2',
        firstName: 'Joaquín',
        lastName: 'Díaz',
        fullName: 'Joaquín Díaz',
        email: 'joaquin@correo.com',
        phone: '+54 9 11 9999-2222',
        telegramUsername: 'joaquin_menor',
        isMinor: true,
        guardianConsent: {
          isSigned: true,
          consentDate: '2026-10-01T00:00:00Z',
          isMinor: true,
          guardianName: 'Ana Díaz',
          guardianPhone: null,
          allowsPhysicalTraining: true,
          allowsHabitsRecommendations: false,
        },
        hasPhoto: false,
      },
    ] as unknown as import('../../../types/structure').Athlete[]);

    render(
      <MemoryRouter initialEntries={['/pf/monitoring?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const presentMinorCard = await screen.findByLabelText(
      /Ver detalle de asistencia y carga de Lucas Gómez/i,
    );
    const absentMinorCard = await screen.findByLabelText(
      /Ver detalle de asistencia y carga de Joaquín Díaz/i,
    );

    const tutorWa = within(presentMinorCard).getByRole('link', {
      name: /Contactar al tutor de Lucas Gómez por WhatsApp/i,
    });
    expect(tutorWa.getAttribute('href')).toContain('https://wa.me/5491144441111?text=');
    expect(tutorWa.getAttribute('href')).not.toContain('5491199991111');
    expect(within(presentMinorCard).queryByRole('link', { name: /Telegram/i })).toBeNull();

    expect(within(absentMinorCard).getByText('El tutor no tiene teléfono cargado')).toBeTruthy();
    expect(within(absentMinorCard).queryByRole('link')).toBeNull();
    expect(structureService.getAthletes).toHaveBeenCalled();
  });

  it('muestra selector de organización y categoría con valor por defecto en todas (KAN-649)', async () => {
    render(
      <MemoryRouter initialEntries={['/seguimiento?tab=attendance']}>
        <MonitoringPage />
      </MemoryRouter>,
    );

    const orgSelect = (await screen.findByLabelText(
      /Filtrar por organización/i,
    )) as HTMLSelectElement;
    const catSelect = (await screen.findByLabelText(/Filtrar por categoría/i)) as HTMLSelectElement;

    expect(orgSelect.value).toBe('');
    expect(catSelect.value).toBe('');
    expect(within(orgSelect).getByText('Todas las organizaciones')).toBeTruthy();
    expect(within(catSelect).getByText('Todas las categorías')).toBeTruthy();
  });
});
