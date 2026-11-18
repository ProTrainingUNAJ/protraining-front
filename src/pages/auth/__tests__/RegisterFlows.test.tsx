import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterChoicePage } from '../RegisterChoicePage';
import { RegisterAthleteInfoPage } from '../RegisterAthleteInfoPage';
import { RegisterPfPage } from '../RegisterPfPage';
import { ConfirmEmailPage } from '../ConfirmEmailPage';
import { LoginForm } from '../../../components/auth/LoginForm';
import { authService } from '../../../api/authService';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

const mockLogin = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithGoogle: vi.fn(),
    isAuthenticated: false,
    user: null,
    isHydrating: false,
    themePreference: 'system',
    setThemePreference: vi.fn(),
  }),
}));

vi.mock('../../../api/authService', () => ({
  authService: {
    registerPf: vi.fn(),
    confirmEmail: vi.fn(),
    resendConfirmation: vi.fn(),
    login: vi.fn(),
  },
}));

describe('Registro "¿Quién sos?", alta y perfil del PF (KAN-602)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('1. "¿Quién sos?" (RegisterChoicePage)', () => {
    it('muestra las dos opciones: "Soy preparador físico" y "Soy atleta"', () => {
      render(
        <MemoryRouter>
          <RegisterChoicePage />
        </MemoryRouter>,
      );

      expect(screen.getByText('¿Quién sos?')).toBeDefined();
      expect(screen.getByText('Soy preparador físico')).toBeDefined();
      expect(screen.getByText(/Armá los planes de tus atletas/i)).toBeDefined();
      expect(screen.getByText('Soy atleta')).toBeDefined();
      expect(screen.getByText(/Entrená con el plan de tu PF/i)).toBeDefined();
      expect(screen.getByText(/¿Ya tenés una cuenta\?/i)).toBeDefined();
    });

    it('navega a /registro/pf al seleccionar "Soy preparador físico"', () => {
      render(
        <MemoryRouter>
          <RegisterChoicePage />
        </MemoryRouter>,
      );

      const pfBtn = screen.getByRole('button', { name: /Soy preparador físico/i });
      fireEvent.click(pfBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/registro/pf');
    });

    it('navega a /registro/atleta al seleccionar "Soy atleta"', () => {
      render(
        <MemoryRouter>
          <RegisterChoicePage />
        </MemoryRouter>,
      );

      const atletaBtn = screen.getByRole('button', { name: /Soy atleta/i });
      fireEvent.click(atletaBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/registro/atleta');
    });
  });

  describe('2. "Soy atleta" sin link de invitación (RegisterAthleteInfoPage)', () => {
    it('no muestra formulario de registro y explica lo del link de WhatsApp', () => {
      render(
        <MemoryRouter>
          <RegisterAthleteInfoPage />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('textbox')).toBeNull();
      expect(
        screen.getByText(/Para sumarte, pedile a tu preparador físico el link de invitación/i),
      ).toBeDefined();
      expect(screen.getByText(/Ya tengo cuenta, iniciar sesión/i)).toBeDefined();
    });

    it('al tocar "Ya tengo cuenta, iniciar sesión" navega a /login', () => {
      render(
        <MemoryRouter>
          <RegisterAthleteInfoPage />
        </MemoryRouter>,
      );

      const loginBtn = screen.getByRole('button', { name: /iniciar sesión/i });
      fireEvent.click(loginBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('3. Formulario de alta del PF (RegisterPfPage)', () => {
    it('valida campos obligatorios y formato de contraseña', async () => {
      render(
        <MemoryRouter>
          <RegisterPfPage />
        </MemoryRouter>,
      );

      const submitBtn = screen.getByRole('button', { name: /Crear mi cuenta/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('El nombre y apellido es obligatorio.')).toBeDefined();
      expect(screen.getByText('El correo electrónico es obligatorio.')).toBeDefined();
      expect(screen.getByText('La contraseña es obligatoria.')).toBeDefined();
    });

    it('envía los datos correctos al SDK y muestra la pantalla "Te mandamos un mail"', async () => {
      vi.mocked(authService.registerPf).mockResolvedValueOnce({
        id: 'pf-123',
        email: 'profe@protraining.com',
        fullName: 'Profesor Carlos',
        message: 'Registro exitoso.',
      });

      render(
        <MemoryRouter>
          <RegisterPfPage />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText('Nombre y apellido'), {
        target: { value: 'Profesor Carlos' },
      });
      fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), {
        target: { value: 'profe@protraining.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Contraseña (mínimo 8 caracteres)'), {
        target: { value: 'Segura123!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Repetir contraseña'), {
        target: { value: 'Segura123!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Teléfono WhatsApp (opcional)'), {
        target: { value: '+54 9 11 2233-4455' },
      });

      const submitBtn = screen.getByRole('button', { name: /Crear mi cuenta/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.registerPf).toHaveBeenCalledWith({
          fullName: 'Profesor Carlos',
          email: 'profe@protraining.com',
          password: 'Segura123!',
          phone: '+54 9 11 2233-4455',
        });
      });

      expect(screen.getByText(/Te mandamos un mail a/i)).toBeDefined();
      expect(screen.getByText('profe@protraining.com')).toBeDefined();
      expect(screen.getByRole('button', { name: /Reenviar mail/i })).toBeDefined();
    });

    it('con 409 Conflict muestra "El correo ya se encuentra registrado." y link a iniciar sesión', async () => {
      vi.mocked(authService.registerPf).mockRejectedValueOnce({
        response: { status: 409 },
        message: 'Ya existe una cuenta registrada con este correo electrónico.',
      });

      render(
        <MemoryRouter>
          <RegisterPfPage />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText('Nombre y apellido'), {
        target: { value: 'Profesor Carlos' },
      });
      fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), {
        target: { value: 'profe.duplicado@protraining.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Contraseña (mínimo 8 caracteres)'), {
        target: { value: 'Segura123!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Repetir contraseña'), {
        target: { value: 'Segura123!' },
      });

      const submitBtn = screen.getByRole('button', { name: /Crear mi cuenta/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/El correo ya se encuentra registrado\./i)).toBeDefined();
      });
    });
  });

  describe('4. Confirmación de email (ConfirmEmailPage)', () => {
    it('con token válido muestra "¡Listo! Ya podés entrar" y botón de login', async () => {
      mockSearchParams = new URLSearchParams('userId=u-1&token=valid-tok');
      vi.mocked(authService.confirmEmail).mockResolvedValueOnce({
        message: 'Correo confirmado exitosamente.',
      });

      render(
        <MemoryRouter>
          <ConfirmEmailPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(authService.confirmEmail).toHaveBeenCalledWith({
          userId: 'u-1',
          token: 'valid-tok',
        });
      });

      expect(screen.getByText(/¡Listo! Ya podés entrar/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeDefined();
    });

    it('con token vencido muestra "El link venció" y opción de reenviar mail', async () => {
      mockSearchParams = new URLSearchParams('userId=u-1&token=expired-tok');
      vi.mocked(authService.confirmEmail).mockRejectedValueOnce({
        response: { status: 400 },
        message: 'El enlace de confirmación es inválido o ha expirado.',
      });

      render(
        <MemoryRouter>
          <ConfirmEmailPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/El link venció/i)).toBeDefined();
      });

      expect(screen.getByRole('button', { name: /Reenviar mail/i })).toBeDefined();
    });
  });

  describe('5. En el login con 403 por email sin confirmar (LoginForm)', () => {
    it('muestra enlace "¿No tenés cuenta? Registrate" que navega a /registro', () => {
      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      const regLink = screen.getByRole('button', { name: /^Registrate$/i });
      expect(regLink).toBeDefined();
      fireEvent.click(regLink);
      expect(mockNavigate).toHaveBeenCalledWith('/registro');
    });

    it('si el backend responde 403 muestra "Confirmá tu email para entrar" y el botón "Reenviar mail"', async () => {
      mockLogin.mockRejectedValueOnce({
        response: { status: 403 },
        message: 'Confirmá tu email para entrar.',
      });

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), {
        target: { value: 'pf.unconfirmed@protraining.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
        target: { value: 'Password123' },
      });

      const submitBtn = screen.getByRole('button', { name: /^Iniciar sesión$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Confirmá tu email para entrar/i)).toBeDefined();
      });

      const resendBtn = screen.getByRole('button', { name: /Reenviar mail/i });
      expect(resendBtn).toBeDefined();

      vi.mocked(authService.resendConfirmation).mockResolvedValueOnce({
        message: 'Nuevo correo enviado.',
      });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(authService.resendConfirmation).toHaveBeenCalledWith(
          'pf.unconfirmed@protraining.com',
        );
      });
    });
  });
});
