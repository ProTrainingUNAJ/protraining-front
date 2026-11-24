import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AnalysisCategoryDropdown } from '../AnalysisCategoryDropdown';
import type { Category, Organization } from '../../../types/structure';

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Primera División', organizationId: 'org-1', athletesCount: 5 },
  { id: 'cat-2', name: 'Reserva', organizationId: 'org-1', athletesCount: 3 },
  { id: 'cat-3', name: 'Musculación', organizationId: 'org-2', athletesCount: 8 },
];

const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Club Atlético',
    categoriesCount: 2,
    hasPhoto: true,
    photoUpdatedAt: '2026-11-20T10:00:00Z',
  },
  { id: 'org-2', name: 'Gimnasio Strongman', categoriesCount: 1, hasPhoto: false },
];

describe('AnalysisCategoryDropdown (KAN-660)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra placeholder en el botón cuando no hay categoría seleccionada', () => {
    render(
      <AnalysisCategoryDropdown
        categories={mockCategories}
        organizations={mockOrganizations}
        selectedCategoryId=""
        onSelectCategory={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Desplegar categorías para análisis/i });
    expect(within(trigger).getByText('Elegí una categoría…')).toBeTruthy();
  });

  it('muestra nombre de categoría y nombre de organización cuando está seleccionada', () => {
    render(
      <AnalysisCategoryDropdown
        categories={mockCategories}
        organizations={mockOrganizations}
        selectedCategoryId="cat-1"
        onSelectCategory={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Desplegar categorías para análisis/i });
    expect(within(trigger).getByText('Primera División')).toBeTruthy();
    expect(within(trigger).getByText('Club Atlético')).toBeTruthy();
  });

  it('despliega la lista de categorías y permite seleccionar una', () => {
    const onSelect = vi.fn();
    render(
      <AnalysisCategoryDropdown
        categories={mockCategories}
        organizations={mockOrganizations}
        selectedCategoryId=""
        onSelectCategory={onSelect}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Desplegar categorías para análisis/i });
    fireEvent.click(trigger);

    // Opciones visibles en el dropdown
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeTruthy();
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);

    // Click en la categoría Musculación (Gimnasio Strongman)
    fireEvent.click(options[2]);
    expect(onSelect).toHaveBeenCalledWith('cat-3');
  });

  it('soporta cambio a través del select nativo accesible', () => {
    const onSelect = vi.fn();
    render(
      <AnalysisCategoryDropdown
        categories={mockCategories}
        organizations={mockOrganizations}
        selectedCategoryId="cat-1"
        onSelectCategory={onSelect}
      />,
    );

    const select = screen.getByLabelText('Categoría para analizar');
    fireEvent.change(select, { target: { value: 'cat-2' } });

    expect(onSelect).toHaveBeenCalledWith('cat-2');
  });
});
