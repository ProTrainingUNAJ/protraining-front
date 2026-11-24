import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InjuriesReturnWidget } from '../InjuriesReturnWidget';
import { structureService } from '../../../api/structureService';
import { listAthleteInjuries } from '../../../api/seguimientoService';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../../api/structureService', () => ({
  structureService: { getAthletes: vi.fn() },
}));
vi.mock('../../../api/seguimientoService', () => ({ listAthleteInjuries: vi.fn() }));
vi.mock('../../../utils/argentinaDate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/argentinaDate')>()),
  todayInArgentina: () => '2026-11-22',
}));

const injuriesMock = vi.mocked(listAthleteInjuries);

function injury(
  id: string,
  athleteId: string,
  zone: string,
  status: 'Active' | 'InRecovery' | 'MedicallyCleared',
  estimatedReturnDate: string,
) {
  return {
    id,
    athleteId,
    zone,
    description: '',
    injuryDate: '2026-11-15',
    estimatedReturnDate: `${estimatedReturnDate}T00:00:00`,
    status,
    createdAt: '2026-11-15T00:00:00Z',
  };
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <InjuriesReturnWidget />
    </MemoryRouter>,
  );
}

describe('InjuriesReturnWidget (KAN-594)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      { id: 'a-lucas', firstName: 'Lucas', lastName: 'Gómez', fullName: 'Lucas Gómez' },
      { id: 'a-camila', firstName: 'Camila', lastName: 'Torres', fullName: 'Camila Torres' },
      { id: 'a-martin', firstName: 'Martín', lastName: 'Pérez', fullName: 'Martín Pérez' },
    ] as never);
  });

  it('lista activas y en recuperación, la que vuelve antes primero, sin las dadas de alta', async () => {
    injuriesMock.mockImplementation(async (athleteId: string) => {
      if (athleteId === 'a-lucas')
        return [injury('i-1', athleteId, 'isquiotibiales', 'Active', '2026-12-02')];
      if (athleteId === 'a-camila')
        return [injury('i-2', athleteId, 'hombros', 'InRecovery', '2026-11-23')];
      return [injury('i-3', athleteId, 'gemelos', 'MedicallyCleared', '2026-11-01')];
    });

    renderWidget();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Camila Torres');
    expect(items[0].textContent).toContain('En recuperación');
    expect(items[0].textContent).toContain('Vuelve mañana');
    expect(items[1].textContent).toContain('Lucas Gómez');
    expect(items[1].textContent).toContain('Activa');
    expect(items[1].textContent).toContain('Vuelve en 10 días (2/12)');
    expect(screen.queryByText('Martín Pérez')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ver en Seguimiento/ }));
    expect(navigateMock).toHaveBeenCalledWith('/pf/monitoring');
  });

  it('sin lesiones muestra el mensaje vacío', async () => {
    injuriesMock.mockResolvedValue([]);
    renderWidget();
    expect(await screen.findByText('No hay lesiones activas.')).toBeDefined();
  });

  it('si fallan todos los pedidos muestra el error con Reintentar', async () => {
    injuriesMock.mockRejectedValue(new Error('caído'));
    renderWidget();
    expect(
      await screen.findByText('No se pudieron consultar las lesiones del plantel.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeDefined();
  });
});
