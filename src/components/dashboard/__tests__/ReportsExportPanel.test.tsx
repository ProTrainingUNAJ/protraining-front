import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportsExportPanel } from '../ReportsExportPanel';
import type { CategoryDashboardSummary } from '../../../types/categoryDashboard';

const summary = {
  athleteCount: 12,
  attendance: { attendancePercentage: 86, presentDays: 40, absentDays: 6 },
  load: { totalLoad: 5400, totalMinutes: 900 },
  injuries: { activeCount: 1, inRecoveryCount: 2, clearedInPeriodCount: 3, athletesAffected: 4 },
} as unknown as CategoryDashboardSummary;

describe('ReportsExportPanel · Informes (KAN-660)', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
  });

  const renderPanel = () =>
    render(
      <ReportsExportPanel
        organizationName="Club Quilmes"
        categoryName="Primera División"
        summary={summary}
        periodLabel="Últimos 30 días"
      />,
    );

  it('no ofrece WhatsApp: el botón es "Copiar informe"', () => {
    renderPanel();

    expect(screen.queryByText(/whatsapp/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Copiar informe/ })).toBeDefined();
  });

  it('"Copiar informe" copia un resumen en texto plano con título, período y métricas', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Copiar informe/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text.split('\n')[0]).toBe(
      'ProTraining · Informe Ejecutivo: Rendimiento y Disponibilidad del Plantel',
    );
    expect(text).toContain('Organización: Club Quilmes');
    expect(text).toContain('Categoría: Primera División');
    expect(text).toContain('Período: Últimos 30 días');
    expect(text).toContain('- Presentismo promedio: 86 % (40 presentes, 6 ausentes)');
    expect(text).toContain('- Carga total acumulada: 5400 UA (900 min)');
    // Sin formato de WhatsApp (asteriscos, emojis)
    expect(text).not.toMatch(/\*/);

    expect(await screen.findByText('Informe copiado al portapapeles')).toBeDefined();
    expect(screen.getByRole('button', { name: /Copiado/ })).toBeDefined();
  });

  it('marca la barra de acciones y la hoja para que al imprimir salga solo el informe', () => {
    const { container } = renderPanel();

    expect(container.querySelector('.reports-export__toolbar')).not.toBeNull();
    expect(container.querySelector('.reports-export__sheet h2')?.textContent).toContain(
      'Informe Ejecutivo',
    );
  });
});
