import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedFilterTabs, type SegmentedFilterOption } from '../SegmentedFilterTabs';

describe('SegmentedFilterTabs (KAN-645)', () => {
  type TestFilter = 'all' | 'critical' | 'caution' | 'optimal';

  const mockOptions: Array<SegmentedFilterOption<TestFilter>> = [
    { value: 'all', label: 'Todos', count: 12, variant: 'all', testId: 'tab-all' },
    {
      value: 'critical',
      label: 'Atención Crítica',
      count: 2,
      variant: 'red',
      hasDot: true,
      testId: 'tab-critical',
    },
    {
      value: 'caution',
      label: 'Precaución',
      count: 4,
      variant: 'yellow',
      hasDot: true,
      testId: 'tab-caution',
    },
    {
      value: 'optimal',
      label: 'Óptimos',
      count: 6,
      variant: 'green',
      hasDot: true,
      testId: 'tab-optimal',
    },
  ];

  it('renderiza todas las opciones con su texto y contador', () => {
    render(
      <SegmentedFilterTabs<TestFilter>
        options={mockOptions}
        value="all"
        onChange={vi.fn()}
        ariaLabel="Filtro de prueba"
      />,
    );

    expect(screen.getByRole('tablist', { name: 'Filtro de prueba' })).toBeDefined();
    expect(screen.getByText('Todos')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('Atención Crítica')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('Precaución')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('Óptimos')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
  });

  it('marca la opción activa con clase active y aria-selected=true', () => {
    render(
      <SegmentedFilterTabs<TestFilter> options={mockOptions} value="critical" onChange={vi.fn()} />,
    );

    const activeTab = screen.getByTestId('tab-critical');
    expect(activeTab.className).toContain('active');
    expect(activeTab.getAttribute('aria-selected')).toBe('true');
    expect(activeTab.getAttribute('aria-pressed')).toBe('true');

    const inactiveTab = screen.getByTestId('tab-all');
    expect(inactiveTab.className).not.toContain('active');
    expect(inactiveTab.getAttribute('aria-selected')).toBe('false');
  });

  it('llama a onChange con el nuevo valor al pulsar un tab inactivo', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedFilterTabs<TestFilter> options={mockOptions} value="all" onChange={handleChange} />,
    );

    const cautionTab = screen.getByTestId('tab-caution');
    fireEvent.click(cautionTab);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('caution');
  });

  it('renderiza dots de color en las opciones que tienen hasDot: true', () => {
    const { container } = render(
      <SegmentedFilterTabs<TestFilter> options={mockOptions} value="all" onChange={vi.fn()} />,
    );

    const dots = container.querySelectorAll('.segmented-tab-dot');
    // 3 de las 4 opciones tienen hasDot: true
    expect(dots.length).toBe(3);
  });
});
