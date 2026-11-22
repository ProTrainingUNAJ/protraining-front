import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationsPage } from '../OrganizationsPage';
import { structureService } from '../../../api/structureService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    withStructureCounts: vi.fn(),
    withCategoryCounts: vi.fn(),
    getCategories: vi.fn(),
    withAthleteCounts: vi.fn(),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getOrganizationPhotoUrl: vi.fn(() => 'http://localhost/logo.webp'),
    uploadOrganizationPhoto: vi.fn(),
    deleteOrganizationPhoto: vi.fn(),
  },
}));

vi.mock('../../../api/categoryInvitations', () => ({
  categoryInvitationsService: {
    generate: vi.fn(),
    getOrGenerate: vi.fn(),
    clearCached: vi.fn(),
  },
}));

describe('OrganizationsPage · Master-Detail Organizaciones y Categorías (KAN-606)', () => {
  const mockOrgs = [
    {
      id: 'org-1',
      name: 'Club Atlético San Martín',
      description: 'Sede Central',
      categoriesCount: 2,
      athletesCount: 25,
      hasPhoto: false,
    },
    {
      id: 'org-2',
      name: 'Defensores del Sur',
      description: 'Predio Deportivo',
      categoriesCount: 1,
      athletesCount: 15,
      hasPhoto: true,
    },
  ];

  const mockCategoriesOrg1 = [
    {
      id: 'cat-1',
      organizationId: 'org-1',
      name: 'Primera División',
      description: 'Plantel Superior',
      athletesCount: 18,
    },
    {
      id: 'cat-2',
      organizationId: 'org-1',
      name: 'Reserva M23',
      description: 'División Reserva',
      athletesCount: 7,
    },
  ];

  const mockCategoriesOrg2 = [
    {
      id: 'cat-3',
      organizationId: 'org-2',
      name: 'Juveniles M19',
      description: 'Formativa',
      athletesCount: 15,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getOrganizations).mockResolvedValue(mockOrgs);
    vi.mocked(structureService.withStructureCounts).mockImplementation(async (orgs) => orgs);
    vi.mocked(structureService.getCategories).mockImplementation(async (orgId) => {
      if (orgId === 'org-2') return mockCategoriesOrg2;
      return mockCategoriesOrg1;
    });
    vi.mocked(structureService.withAthleteCounts).mockImplementation(async (cats) => cats);
  });

  it('renderiza la vista Master-Detail con organizaciones en panel lateral y categorías en panel principal', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    // Header principal
    expect(screen.getByRole('heading', { level: 1, name: /Organizaciones/i })).toBeDefined();

    // Panel Master
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeDefined();
      expect(screen.getByRole('heading', { level: 3, name: 'Defensores del Sur' })).toBeDefined();
    });

    // Panel Detail (por defecto la primera organización seleccionada en el banner)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Club Atlético San Martín' }),
    ).toBeDefined();

    // Categorías en Detail
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Primera División' })).toBeDefined();
      expect(screen.getByRole('heading', { level: 3, name: 'Reserva M23' })).toBeDefined();
    });
  });

  it('permite cambiar dinámicamente de organización seleccionada y actualiza las categorías correspondientes', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Defensores del Sur' })).toBeDefined();
    });

    // Clic en la segunda organización
    const org2Card = screen.getByRole('button', { name: /Seleccionar Defensores del Sur/i });
    fireEvent.click(org2Card);

    // Debe cargar las categorías de la segunda organización
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Juveniles M19' })).toBeDefined();
      expect(screen.queryByRole('heading', { level: 3, name: 'Primera División' })).toBeNull();
    });
  });

  it('filtra organizaciones mediante el buscador independiente de organizaciones', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeDefined();
      expect(screen.getByRole('heading', { level: 3, name: 'Defensores del Sur' })).toBeDefined();
    });

    const orgSearchInput = screen.getByLabelText(/Buscar organización/i);
    fireEvent.change(orgSearchInput, { target: { value: 'Defensores' } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Defensores del Sur' })).toBeDefined();
      expect(
        screen.queryByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeNull();
    });
  });

  it('filtra categorías mediante el buscador independiente de categorías', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Primera División' })).toBeDefined();
      expect(screen.getByRole('heading', { level: 3, name: 'Reserva M23' })).toBeDefined();
    });

    const catSearchInput = screen.getByLabelText(/Buscar categoría/i);
    fireEvent.change(catSearchInput, { target: { value: 'Reserva' } });

    expect(screen.getByRole('heading', { level: 3, name: 'Reserva M23' })).toBeDefined();
    expect(screen.queryByRole('heading', { level: 3, name: 'Primera División' })).toBeNull();
  });

  it('permite abrir el modal y dar de alta una nueva organización', async () => {
    vi.mocked(structureService.createOrganization).mockResolvedValueOnce({
      id: 'org-3',
      name: 'Club Social y Deportivo',
      description: 'Nueva filial',
      categoriesCount: 0,
    });

    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeDefined();
    });

    const newOrgBtn = screen.getByRole('button', { name: /Nueva Organización/i });
    fireEvent.click(newOrgBtn);

    // Modal de alta
    expect(screen.getByRole('heading', { level: 3, name: 'Nueva Organización' })).toBeDefined();

    const nameInput = screen.getByLabelText(/Nombre del Club u Organización \*/i);
    const descInput = screen.getByLabelText(/Descripción o Sede \(opcional\)/i);

    fireEvent.change(nameInput, { target: { value: 'Club Social y Deportivo' } });
    fireEvent.change(descInput, { target: { value: 'Nueva filial' } });

    const submitBtn = screen.getByRole('button', { name: 'Crear Organización' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(structureService.createOrganization).toHaveBeenCalledWith({
        name: 'Club Social y Deportivo',
        description: 'Nueva filial',
      });
      expect(screen.getByText('La organización se creó exitosamente.')).toBeDefined();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Club Social y Deportivo' }),
      ).toBeDefined();
    });
  });

  it('permite editar una organización existente', async () => {
    vi.mocked(structureService.updateOrganization).mockResolvedValueOnce({
      id: 'org-1',
      name: 'Club Atlético San Martín (Modificado)',
      description: 'Sede Central Renovada',
      categoriesCount: 2,
    });

    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeDefined();
    });

    // Abrir editar desde la tarjeta de la organización
    const editBtn = screen.getByRole('button', { name: /Editar Club Atlético San Martín/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Editar Organización' })).toBeDefined();

    const nameInput = screen.getByLabelText(/Nombre del Club u Organización \*/i);
    fireEvent.change(nameInput, { target: { value: 'Club Atlético San Martín (Modificado)' } });

    const submitBtn = screen.getByRole('button', { name: 'Guardar Cambios' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(structureService.updateOrganization).toHaveBeenCalledWith('org-1', {
        name: 'Club Atlético San Martín (Modificado)',
        description: 'Sede Central',
      });
      expect(screen.getByText('La organización se actualizó exitosamente.')).toBeDefined();
    });
  });

  it('permite eliminar una organización tras confirmar en el modal de advertencia', async () => {
    vi.mocked(structureService.deleteOrganization).mockResolvedValueOnce();

    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Defensores del Sur')).toBeDefined();
    });

    // Seleccionar la organización a eliminar
    const orgItem = screen.getByRole('button', { name: /Seleccionar Defensores del Sur/i });
    fireEvent.click(orgItem);

    const deleteBtn = await screen.findByRole('button', {
      name: /Eliminar Defensores del Sur/i,
    });
    fireEvent.click(deleteBtn);

    // Modal de confirmación
    expect(screen.getByRole('heading', { level: 3, name: 'Eliminar Organización' })).toBeDefined();
    expect(
      screen.getByText(
        /¿Estás seguro de que deseás eliminar la organización "Defensores del Sur"\?/i,
      ),
    ).toBeDefined();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Eliminar Definitivamente' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(structureService.deleteOrganization).toHaveBeenCalledWith('org-2');
      expect(
        screen.getByText(/La organización "Defensores del Sur" fue eliminada correctamente\./i),
      ).toBeDefined();
      expect(screen.queryByText('Defensores del Sur')).toBeNull();
    });
  });

  it('permite crear una nueva categoría asociada a la organización seleccionada', async () => {
    vi.mocked(structureService.createCategory).mockResolvedValueOnce({
      id: 'cat-new',
      organizationId: 'org-1',
      name: 'Intermedia M21',
      description: 'Plantel Intermedio',
      athletesCount: 0,
    });

    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Nueva Categoría/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nueva Categoría/i }));

    expect(screen.getByRole('heading', { level: 3, name: 'Nueva Categoría' })).toBeDefined();
    expect(screen.getByText(/Club:/i)).toBeDefined();

    const catNameInput = screen.getByLabelText(/Nombre de la División o Categoría \*/i);
    fireEvent.change(catNameInput, { target: { value: 'Intermedia M21' } });

    const submitBtn = screen.getByRole('button', { name: 'Crear Categoría' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(structureService.createCategory).toHaveBeenCalledWith('org-1', {
        name: 'Intermedia M21',
        description: null,
      });
      expect(screen.getByText('La categoría fue creada con éxito.')).toBeDefined();
      expect(screen.getByRole('heading', { level: 3, name: 'Intermedia M21' })).toBeDefined();
    });
  });

  it('permite eliminar una categoría tras confirmación', async () => {
    vi.mocked(structureService.deleteCategory).mockResolvedValueOnce();

    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Primera División' })).toBeDefined();
    });

    const deleteCatBtn = screen.getByRole('button', { name: /Eliminar Primera División/i });
    fireEvent.click(deleteCatBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Eliminar Categoría' })).toBeDefined();
    expect(
      screen.getByText(/¿Estás seguro de que deseás eliminar la categoría "Primera División"\?/i),
    ).toBeDefined();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Eliminar Definitivamente' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(structureService.deleteCategory).toHaveBeenCalledWith('cat-1');
      expect(
        screen.getByText(/La categoría "Primera División" fue eliminada correctamente\./i),
      ).toBeDefined();
      expect(screen.queryByRole('heading', { level: 3, name: 'Primera División' })).toBeNull();
    });
  });

  it('navega a /pf/athletes pasando el state con la categoría al hacer clic en "Ver Atletas"', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Primera División' })).toBeDefined();
    });

    const verAtletasButtons = screen.getAllByRole('button', { name: /Ver Atletas/i });
    expect(verAtletasButtons.length).toBeGreaterThan(0);
    fireEvent.click(verAtletasButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/pf/athletes', { state: { catId: 'cat-1' } });
  });

  it('muestra esqueleto (sin texto "Cargando…") cuando la carga inicial tarda más de 300 ms (KAN-597)', async () => {
    vi.useFakeTimers();
    try {
      let resolveOrgs!: (value: typeof mockOrgs) => void;
      vi.mocked(structureService.getOrganizations).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOrgs = resolve;
        }),
      );

      render(
        <MemoryRouter initialEntries={['/pf/organizations']}>
          <OrganizationsPage />
        </MemoryRouter>,
      );

      // Antes de 300 ms no muestra esqueleto ni texto de carga
      expect(screen.queryByText(/Cargando organizaciones/i)).toBeNull();
      expect(screen.queryByRole('status', { name: /Cargando organizaciones/i })).toBeNull();

      // Al cumplirse 300 ms muestra el esqueleto
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(screen.getByRole('status', { name: /Cargando organizaciones/i })).toBeDefined();
      expect(screen.queryByText(/Cargando organizaciones/i)).toBeNull();

      // Al resolverse, aparece el contenido
      await act(async () => {
        resolveOrgs(mockOrgs);
        await vi.advanceTimersByTimeAsync(450);
      });
      expect(
        screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('al tocar Actualizar mantiene los datos anteriores a la vista sin parpadeo (KAN-597)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/organizations']}>
        <OrganizationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
      ).toBeDefined();
      expect(screen.getByRole('heading', { level: 3, name: 'Primera División' })).toBeDefined();
    });

    let resolveRefresh!: (value: typeof mockOrgs) => void;
    vi.mocked(structureService.getOrganizations).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Actualizar organizaciones/i }));

    // Mientras actualiza, los datos previos siguen visibles y no aparece "Cargando organizaciones…"
    expect(
      screen.getByRole('heading', { level: 3, name: 'Club Atlético San Martín' }),
    ).toBeDefined();
    expect(screen.getByRole('heading', { level: 3, name: 'Primera División' })).toBeDefined();
    expect(screen.queryByText(/Cargando organizaciones/i)).toBeNull();

    resolveRefresh(mockOrgs);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Actualizar organizaciones/i })).not.toHaveProperty(
        'disabled',
        true,
      );
    });
  });
});
