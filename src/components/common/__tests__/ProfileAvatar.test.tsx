import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ProfileAvatar } from '../ProfileAvatar';
import { httpClient } from '../../../api/axiosClient';

vi.mock('../../../api/axiosClient', () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

describe('ProfileAvatar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-uuid');
  });

  it('renders initials when no src is provided', () => {
    render(<ProfileAvatar name="Lucas Fernández" />);
    expect(screen.getByText('LF')).toBeDefined();
  });

  it('renders img element when src is provided', () => {
    render(
      <ProfileAvatar
        name="Lucas Fernández"
        src="http://localhost:8080/identidad/api/v1/users/me/photo"
      />,
    );
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('http://localhost:8080/identidad/api/v1/users/me/photo');
  });

  it('falls back to initials when img onError fires', () => {
    render(<ProfileAvatar name="Lucas Fernández" src="http://localhost:8080/broken-image.webp" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('LF')).toBeDefined();
  });

  it('renders single initial for single-word name', () => {
    render(<ProfileAvatar name="Boca" shape="rounded" />);
    expect(screen.getByText('B')).toBeDefined();
  });

  it('resolves API photo url without duplicating /api and creates authenticated blob url', async () => {
    const mockBlob = new Blob(['image data'], { type: 'image/webp' });
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockBlob });

    render(<ProfileAvatar name="Lucas Fernández" src="/api/identidad/api/v1/users/123/photo" />);

    // Verifies httpClient stripped leading /api/ so axios baseURL '/api' does not duplicate to /api/api/...
    expect(httpClient.get).toHaveBeenCalledWith('/identidad/api/v1/users/123/photo', {
      responseType: 'blob',
    });

    // Once blob URL is ready, renders img with blob: URL
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('blob:http://localhost/mock-blob-uuid');
    });
  });

  it('shows initials without rendering broken img if API returns error (e.g. 404)', async () => {
    vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('404 Not Found'));

    render(<ProfileAvatar name="Preparador Físico" src="/identidad/api/v1/users/me/photo" />);

    await waitFor(() => {
      expect(httpClient.get).toHaveBeenCalledWith('/identidad/api/v1/users/me/photo', {
        responseType: 'blob',
      });
    });

    // Once request fails, falls back to initials
    await waitFor(() => {
      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.getByText('PF')).toBeDefined();
    });
  });
});
