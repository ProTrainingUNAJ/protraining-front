import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InvitationLandingPage } from '../InvitationLandingPage';
import { categoryInvitationsService } from '../../../api/categoryInvitations';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRegisterByInvitation = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    registerByInvitation: mockRegisterByInvitation,
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock('../../../api/categoryInvitations', async () => {
  const actual = await vi.importActual('../../../api/categoryInvitations');
  return {
    ...actual,
    categoryInvitationsService: {
      validate: vi.fn(),
      accept: vi.fn(),
    },
  };
});

describe('InvitationLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (initialToken = 'token-valido-123') => {
    return render(
      <MemoryRouter initialEntries={[`/invite/${initialToken}`]}>
        <Routes>
          <Route path="/invite/:token" element={<InvitationLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('muestra el estado de carga al iniciar', () => {
    vi.mocked(categoryInvitationsService.validate).mockImplementation(
      () => new Promise(() => {}), // nunca resuelve para ver loading
    );

    renderPage();
    expect(screen.getByText('Verificando invitación...')).toBeDefined();
  });

  it('muestra mensaje claro cuando la invitación venció (410)', async () => {
    const error410 = new Error('Invitación expirada', { cause: { response: { status: 410 } } });
    vi.mocked(categoryInvitationsService.validate).mockRejectedValueOnce(error410);

    renderPage('token-expirado');

    await waitFor(() => {
      expect(screen.getByText('La invitación venció')).toBeDefined();
    });
    expect(
      screen.getByText(
        /La invitación venció\. Pedile a tu preparador físico que genere una nueva\./i,
      ),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /Ir a iniciar sesión/i })).toBeDefined();
  });

  it('muestra mensaje cuando el token es inválido (404)', async () => {
    const error404 = new Error('No encontrada', { cause: { response: { status: 404 } } });
    vi.mocked(categoryInvitationsService.validate).mockRejectedValueOnce(error404);

    renderPage('token-invalido');

    await waitFor(() => {
      expect(screen.getByText('Invitación no válida')).toBeDefined();
    });
    expect(
      screen.getByText(
        /La invitación no es válida\. Verificá el enlace o pedile uno nuevo a tu PF\./i,
      ),
    ).toBeDefined();
  });

  it('muestra el formulario con el nombre de la categoría cuando el token es válido', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByText(/Invitación para Primera División/i)).toBeDefined();
    });
    expect(screen.getByLabelText(/Nombre/i)).toBeDefined();
    expect(screen.getByLabelText(/Apellido/i)).toBeDefined();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeDefined();
    expect(screen.getByLabelText(/^Contraseña/i)).toBeDefined();
    expect(screen.getByLabelText(/Teléfono celular/i)).toBeDefined();
    expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeDefined();
    expect(screen.queryByText(/Datos de tu madre, padre o tutor/i)).toBeNull();
  });

  it('despliega los campos de tutor si la fecha indica que es menor de edad (< 18 años)', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Juveniles Sub-17',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeDefined();
    });

    // Ingresar fecha de nacimiento de 16 años (ej. 2010-05-15)
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '2010-05-15' },
    });

    expect(screen.getByText(/Datos de tu madre, padre o tutor/i)).toBeDefined();
    expect(screen.getByLabelText(/Nombre completo del tutor/i)).toBeDefined();
    expect(screen.getByLabelText(/Correo del tutor/i)).toBeDefined();
    expect(screen.getByLabelText(/Teléfono del tutor/i)).toBeDefined();
    expect(
      screen.getByText(
        /Autorizo la realización de entrenamientos físicos y actividades deportivas/i,
      ),
    ).toBeDefined();
  });

  it('valida que el tutor autorice obligatoriamente el entrenamiento físico si es menor', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Juveniles Sub-17',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Mateo' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Fernández' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'mateo@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Pass1234' } });
    fireEvent.change(screen.getByLabelText(/Teléfono celular/i), {
      target: { value: '+5491112345678' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '2010-05-15' },
    });

    // Completar datos de tutor pero sin tildar autorización
    fireEvent.change(screen.getByLabelText(/Nombre completo del tutor/i), {
      target: { value: 'Roberto Fernández' },
    });
    fireEvent.change(screen.getByLabelText(/Correo del tutor/i), {
      target: { value: 'roberto@ejemplo.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    expect(
      screen.getByText(/El tutor legal debe autorizar obligatoriamente la preparación física/i),
    ).toBeDefined();
    expect(mockRegisterByInvitation).not.toHaveBeenCalled();
  });

  it('completa el registro para un atleta adulto y redirige a /athlete', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    mockRegisterByInvitation.mockResolvedValueOnce({
      accessToken: 'jwt-123',
      user: { id: 'u-1', role: 'Atleta' },
    });

    vi.mocked(categoryInvitationsService.accept).mockResolvedValueOnce({
      id: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Pratto',
      email: 'lucas@ejemplo.com',
    } as never);

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Lucas' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Pratto' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'lucas@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Pass1234' } });
    fireEvent.change(screen.getByLabelText(/Teléfono celular/i), {
      target: { value: '+5491199887766' },
    });
    // Adulto: nacido en 1995
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '1995-04-10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    await waitFor(() => {
      expect(mockRegisterByInvitation).toHaveBeenCalledWith({
        email: 'lucas@ejemplo.com',
        password: 'Pass1234',
        fullName: 'Lucas Pratto',
        token: 'tok-123',
      });
    });

    expect(categoryInvitationsService.accept).toHaveBeenCalledWith('tok-123', {
      firstName: 'Lucas',
      lastName: 'Pratto',
      email: 'lucas@ejemplo.com',
      phone: '+5491199887766',
      birthDate: '1995-04-10',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/athlete', { replace: true });
  });

  it('muestra mensaje específico si el email corresponde a un PF (403)', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    const error403 = new Error('Forbidden', { cause: { response: { status: 403 } } });
    mockRegisterByInvitation.mockRejectedValueOnce(error403);

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Carlos' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Entrenador' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'pf@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Pass1234' } });
    fireEvent.change(screen.getByLabelText(/Teléfono celular/i), {
      target: { value: '+5491111111111' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '1990-01-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    await waitFor(() => {
      expect(screen.getByText('Este correo corresponde a un preparador físico.')).toBeDefined();
    });
  });

  it('muestra mensaje y enlace de inicio de sesión si el email ya existe (409)', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    const error409 = new Error('Conflict', { cause: { response: { status: 409 } } });
    mockRegisterByInvitation.mockRejectedValueOnce(error409);

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Gómez' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'ana@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Pass1234' } });
    fireEvent.change(screen.getByLabelText(/Teléfono celular/i), {
      target: { value: '+5491122334455' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '1998-02-20' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    await waitFor(() => {
      expect(screen.getByText('Ya tenés cuenta, iniciá sesión.')).toBeDefined();
    });
    expect(screen.getByRole('link', { name: /Hacé clic acá para iniciar sesión/i })).toBeDefined();
  });
});
