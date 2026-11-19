import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PfWelcomeModal } from '../PfWelcomeModal';

describe('PfWelcomeModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <MemoryRouter>
        <PfWelcomeModal isOpen={false} coachName="Julian" onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza título, mensaje de agradecimiento y nombre del PF cuando isOpen es true', () => {
    render(
      <MemoryRouter>
        <PfWelcomeModal isOpen={true} coachName="Julian Antunes" onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/¡Te damos la bienvenida, Julian Antunes!/i)).toBeDefined();
    expect(screen.getByText(/¡Gracias por elegir ProTraining!/i)).toBeDefined();
    expect(screen.getByText(/Crear mi primera organización/i)).toBeDefined();
    expect(screen.getByText(/Explorar el panel de inicio/i)).toBeDefined();
  });

  it('invoca onClose al hacer clic en Explorar el panel de inicio', () => {
    const onCloseSpy = vi.fn();
    render(
      <MemoryRouter>
        <PfWelcomeModal isOpen={true} coachName="Julian" onClose={onCloseSpy} />
      </MemoryRouter>,
    );

    const exploreBtn = screen.getByRole('button', { name: /Explorar el panel de inicio/i });
    fireEvent.click(exploreBtn);

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });
});

