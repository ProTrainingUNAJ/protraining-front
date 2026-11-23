import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from '../users';
import { structureService } from '../structureService';
import { httpClient } from '../axiosClient';

vi.mock('../axiosClient', () => ({
  httpClient: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  extractErrorMessage: vi.fn((err: unknown) => String(err)),
}));

describe('Photo URLs & Services (KAN-512)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob');
  });

  it('usersService.getMyPhotoUrl returns relative path without duplicate /api', () => {
    expect(usersService.getMyPhotoUrl()).toBe('/identidad/api/v1/users/me/photo');
    expect(usersService.getMyPhotoUrl('user-123')).toBe('/identidad/api/v1/users/user-123/photo');
    expect(usersService.getMyPhotoUrl('user-123', '2026-11-22T10:00:00Z')).toBe(
      '/identidad/api/v1/users/user-123/photo?v=2026-11-22T10%3A00%3A00Z',
    );
  });

  it('usersService.getPfPhotoUrl returns relative path without duplicate /api', () => {
    expect(usersService.getPfPhotoUrl()).toBe('/identidad/api/v1/users/me/pf-photo');
    expect(usersService.getPfPhotoUrl('pf-456')).toBe('/identidad/api/v1/users/pf-456/photo');
    expect(usersService.getPfPhotoUrl('pf-456', '12345')).toBe(
      '/identidad/api/v1/users/pf-456/photo?v=12345',
    );
  });

  it('usersService.getUserPhotoBlob calls httpClient with clean relative URL and returns blob URL', async () => {
    const mockBlob = new Blob(['photo-data'], { type: 'image/webp' });
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockBlob });

    const blobUrl = await usersService.getUserPhotoBlob('user-123');
    expect(httpClient.get).toHaveBeenCalledWith('/identidad/api/v1/users/user-123/photo', {
      responseType: 'blob',
    });
    expect(blobUrl).toBe('blob:http://localhost/mock-blob');
  });

  it('structureService.getAthletePhotoUrl returns relative path without duplicate /api', () => {
    expect(structureService.getAthletePhotoUrl('ath-789')).toBe(
      '/estructura/api/v1/athletes/ath-789/photo',
    );
    expect(structureService.getAthletePhotoUrl('ath-789', 'v1')).toBe(
      '/estructura/api/v1/athletes/ath-789/photo?v=v1',
    );
  });

  it('structureService.getOrganizationPhotoUrl returns relative path without duplicate /api', () => {
    expect(structureService.getOrganizationPhotoUrl('org-101')).toBe(
      '/estructura/api/v1/organizations/org-101/photo',
    );
  });

  it('structureService.getAthletePhotoBlob calls httpClient with clean relative URL', async () => {
    const mockBlob = new Blob(['athlete-photo'], { type: 'image/webp' });
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockBlob });

    const blobUrl = await structureService.getAthletePhotoBlob('ath-789');
    expect(httpClient.get).toHaveBeenCalledWith('/estructura/api/v1/athletes/ath-789/photo', {
      responseType: 'blob',
    });
    expect(blobUrl).toBe('blob:http://localhost/mock-blob');
  });
});
