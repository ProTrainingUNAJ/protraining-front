import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekCompletionStrip } from '../WeekCompletionStrip';
import type { AthleteWeekDay } from '../../../types/seguimiento';

const days: AthleteWeekDay[] = [
  { date: '2026-10-26', dayOfWeek: 'Monday', completed: true },
  { date: '2026-10-27', dayOfWeek: 'Tuesday', completed: true },
  { date: '2026-10-28', dayOfWeek: 'Wednesday', completed: false },
  { date: '2026-10-29', dayOfWeek: 'Thursday', completed: false },
  { date: '2026-10-30', dayOfWeek: 'Friday', completed: false },
  { date: '2026-10-31', dayOfWeek: 'Saturday', completed: false },
  { date: '2026-11-01', dayOfWeek: 'Sunday', completed: false },
];

describe('WeekCompletionStrip', () => {
  it('renders 7 days and marks completed ones', () => {
    render(<WeekCompletionStrip days={days} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByLabelText('Lun: completado')).toBeDefined();
    expect(screen.getByLabelText('Mar: completado')).toBeDefined();
    expect(screen.getByLabelText('Mié: pendiente')).toBeDefined();
  });

  it('renders loading state', () => {
    const { container } = render(<WeekCompletionStrip days={[]} isLoading />);
    expect(container.querySelectorAll('.wcs-day--loading')).toHaveLength(7);
  });

  it('renders nothing when no days', () => {
    const { container } = render(<WeekCompletionStrip days={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
