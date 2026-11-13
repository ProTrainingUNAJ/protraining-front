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
vi.mock('../../../api/authService', () => ({
  authService: {
    registerByInvitation: (...args: unknown[]) => mockRegisterByInvitation(...args),
  },
}));

const mockApplySession = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    applySession: mockApplySession,
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

  it('completa el registro para un menor de edad enviando los consentimientos del tutor legal', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-menor-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-juvenil',
      categoryName: 'Juveniles Sub-17',
      invitationUrl: 'http://localhost/invite/tok-menor-123',
    });

    mockRegisterByInvitation.mockResolvedValueOnce({
      accessToken: 'jwt-menor-123',
      user: { id: 'u-menor-1', role: 'Atleta' },
    });

    vi.mocked(categoryInvitationsService.accept).mockResolvedValueOnce({
      id: 'ath-menor-1',
      firstName: 'Tomás',
      lastName: 'González',
      email: 'tomas@ejemplo.com',
    } as never);

    renderPage('tok-menor-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Tomás' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'González' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'tomas@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Pass1234' } });
    fireEvent.change(screen.getByLabelText(/Teléfono celular/i), {
      target: { value: '+5491133334444' },
    });
    // Menor de 16 años
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '2010-06-15' },
    });

    // Campos del tutor
    fireEvent.change(screen.getByLabelText(/Nombre completo del tutor/i), {
      target: { value: 'Mariana González' },
    });
    fireEvent.change(screen.getByLabelText(/Correo del tutor/i), {
      target: { value: 'mariana@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono del tutor/i), {
      target: { value: '+5491155556666' },
    });

    // Autorización obligatoria de PF
    fireEvent.click(
      screen.getByLabelText(
        /Autorizo la realización de entrenamientos físicos y actividades deportivas/i,
      ),
    );
    // Autorización opcional de hábitos
    fireEvent.click(
      screen.getByLabelText(/Autorizo a recibir recomendaciones sobre hábitos saludables/i),
    );

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    await waitFor(() => {
      expect(mockRegisterByInvitation).toHaveBeenCalledWith({
        email: 'tomas@ejemplo.com',
        password: 'Pass1234',
        fullName: 'Tomás González',
        token: 'tok-menor-123',
      });
    });

    expect(categoryInvitationsService.accept).toHaveBeenCalledWith('tok-menor-123', {
      firstName: 'Tomás',
      lastName: 'González',
      email: 'tomas@ejemplo.com',
      phone: '+5491133334444',
      birthDate: '2010-06-15',
      guardianName: 'Mariana González',
      guardianEmail: 'mariana@ejemplo.com',
      guardianPhone: '+5491155556666',
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: true,
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

  it('valida que la contraseña tenga mínimo 8 caracteres y al menos un número y muestra el texto explicativo', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    renderPage('tok-123');

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre/i)).toBeDefined();
    });

    expect(screen.getByText('Mínimo 8 caracteres y al menos un número')).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Lucas' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Pratto' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'lucas@ejemplo.com' },
    });
    // Menos de 8 caracteres
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Pass1' } });
    fireEvent.change(screen.getByLabelText(/Teléfono celular/i), {
      target: { value: '+5491199887766' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '1995-04-10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    expect(
      screen.getByText(
        'La contraseña debe tener al menos 8 caracteres y contener al menos un número.',
      ),
    ).toBeDefined();

    // 8 caracteres pero sin números
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Sololetras' } });
    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    expect(
      screen.getByText(
        'La contraseña debe tener al menos 8 caracteres y contener al menos un número.',
      ),
    ).toBeDefined();
    expect(mockRegisterByInvitation).not.toHaveBeenCalled();
  });

  it('no redirige a /athlete si accept falla tras el registro y permite reintentar sin volver a registrar', async () => {
    vi.mocked(categoryInvitationsService.validate).mockResolvedValueOnce({
      token: 'tok-123',
      expiresAt: '2026-11-20T12:00:00Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost/invite/tok-123',
    });

    const mockSession = {
      accessToken: 'jwt-123',
      user: { id: 'u-1', role: 'Atleta' },
    };
    mockRegisterByInvitation.mockResolvedValueOnce(mockSession);

    // Primer intento de accept falla (ej. error 400 o de validación de Estructura)
    vi.mocked(categoryInvitationsService.accept)
      .mockRejectedValueOnce(new Error('Datos inválidos del tutor legal.'))
      .mockResolvedValueOnce({ id: 'ath-1' } as never);

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
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
      target: { value: '1995-04-10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    // Espera que aparezca el error en la landing
    await waitFor(() => {
      expect(screen.getByText('Datos inválidos del tutor legal.')).toBeDefined();
    });

    // La sesión NO debió activarse aún en el contexto ni debió navegar a /athlete
    expect(mockApplySession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/athlete', expect.anything());

    // Al reintentar, ya no debe pedir contraseña y NO debe llamar nuevamente a registerByInvitation
    expect(mockRegisterByInvitation).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Completar registro/i }));

    await waitFor(() => {
      expect(categoryInvitationsService.accept).toHaveBeenCalledTimes(2);
    });

    // En el segundo intento exitoso, recién se activa la sesión y se navega
    expect(mockRegisterByInvitation).toHaveBeenCalledTimes(1);
    expect(mockApplySession).toHaveBeenCalledWith(mockSession);
    expect(mockNavigate).toHaveBeenCalledWith('/athlete', { replace: true });
  });
});
