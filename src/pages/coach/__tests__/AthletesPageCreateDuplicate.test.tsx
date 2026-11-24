import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AthletesPage } from '../AthletesPage';
import { structureService } from '../../../api/structureService';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getAthletes: vi.fn(),
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
    withCategories: vi.fn(),
    getAthletePhotoUrl: vi.fn(),
    createAthlete: vi.fn(),
  },
}));

vi.mock('../../../api/authService', () => ({
  authService: { resetAthletePassword: vi.fn() },
}));

const conflict = (message: string) => new Error(message, { cause: { response: { status: 409 } } });

async function fillAndSubmit(email: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Nuevo Atleta' }));
  fireEvent.change(screen.getByLabelText(/Nombre/, { selector: '#ath-first' }), {
    target: { value: 'Lucas' },
  });
  fireEvent.change(screen.getByLabelText(/Apellido/, { selector: '#ath-last' }), {
    target: { value: 'Gómez' },
  });
  fireEvent.change(screen.getByLabelText(/Correo Electrónico/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Teléfono/, { selector: '#ath-phone' }), {
    target: { value: '1150000000' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar Atleta' }));
}

describe('AthletesPage · alta con correo ya registrado (KAN-660)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getAthletes).mockResolvedValue([]);
    vi.mocked(structureService.getOrganizations).mockResolvedValue([]);
    vi.mocked(structureService.getCategories).mockResolvedValue([]);
    vi.mocked(structureService.withCategories).mockResolvedValue([]);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

  it('muestra el 409 junto al campo de correo y deja el formulario abierto', async () => {
    vi.mocked(structureService.createAthlete).mockRejectedValue(
      conflict('Ya existe un usuario registrado con este correo electrónico.'),
    );
    renderPage();

    await fillAndSubmit('lucas@club.com');

    const fieldError = await screen.findByText(
      'Ya existe un usuario registrado con este correo electrónico.',
    );
    expect(fieldError.id).toBe('ath-email-error');
    const emailInput = screen.getByLabelText(/Correo Electrónico/);
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.getAttribute('aria-describedby')).toBe('ath-email-error');
    // El formulario sigue abierto con lo cargado, para corregir el correo
    expect((emailInput as HTMLInputElement).value).toBe('lucas@club.com');

    // Al corregir el correo, el error se va
    fireEvent.change(emailInput, { target: { value: 'lucas.gomez@club.com' } });
    expect(
      screen.queryByText('Ya existe un usuario registrado con este correo electrónico.'),
    ).toBeNull();
  });

  it('otros errores siguen yendo al aviso general, no al campo', async () => {
    vi.mocked(structureService.createAthlete).mockRejectedValue(
      new Error('Base de datos no disponible.'),
    );
    renderPage();

    await fillAndSubmit('lucas@club.com');

    expect(await screen.findByText('Base de datos no disponible.')).toBeDefined();
    expect(document.getElementById('ath-email-error')).toBeNull();
  });

  it('abre el alta de atleta dentro de una ventana modal emergente accesible (KAN-660)', async () => {
    renderPage();
    const openBtn = await screen.findByRole('button', { name: 'Nuevo Atleta' });
    fireEvent.click(openBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Alta de Atleta en el Plantel' })).toBeDefined();

    // Puede cerrarse con el botón cancelar
    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
