import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PhotoUploadControl } from '../PhotoUploadControl';

describe('PhotoUploadControl Component', () => {
  it('renders avatar and upload label', () => {
    const handleUpload = vi.fn().mockResolvedValue(undefined);
    render(
      <PhotoUploadControl
        name="Julián Pérez"
        onUpload={handleUpload}
        uploadButtonLabel="Cambiar foto"
      />
    );

    expect(screen.getByText('JP')).toBeDefined();
    expect(screen.getByText('Cambiar foto')).toBeDefined();
  });

  it('renders delete button when currentPhotoUrl and onDelete are provided', async () => {
    const handleUpload = vi.fn().mockResolvedValue(undefined);
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <PhotoUploadControl
        name="Julián Pérez"
        currentPhotoUrl="http://localhost:8080/identidad/api/v1/users/me/photo"
        onUpload={handleUpload}
        onDelete={handleDelete}
      />
    );

    const deleteBtn = screen.getByText('Eliminar');
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });
  });
});
