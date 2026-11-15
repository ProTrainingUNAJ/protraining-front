import {
  updateWhatsAppPhone as updatePhoneSdk,
  getPfContact as getPfContactSdk,
  type PfContact,
  type UpdatePhoneResponse,
} from './generated/identidad';
import { httpClient, extractErrorMessage } from './axiosClient';

/**
 * Servicio de usuarios y contacto de WhatsApp (KAN-562 / KAN-379).
 * Utiliza los clientes del SDK generado conectados a través del Gateway.
 */
export const usersService = {
  /**
   * Actualiza el teléfono de WhatsApp del preparador físico autenticado.
   * Llama a PUT /api/v1/users/me/phone a través del SDK de Identidad.
   */
  async updateWhatsAppPhone(phoneNumber: string): Promise<UpdatePhoneResponse> {
    try {
      const { data } = await updatePhoneSdk({
        body: { phoneNumber },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Obtiene el número de WhatsApp del preparador físico del atleta autenticado.
   * Llama a GET /api/v1/users/me/pf-contact a través del SDK de Identidad.
   * Si el PF aún no cargó su WhatsApp (404), retorna null sin lanzar excepción.
   */
  async getPfContact(): Promise<PfContact | null> {
    try {
      const { data } = await getPfContactSdk({
        throwOnError: true,
      });
      return data;
    } catch (error: unknown) {
      // Si el backend responde 404 porque el preparador aún no tiene número cargado,
      // retornamos null para que la vista del atleta no renderice el botón de WhatsApp.
      const isNotFound =
        (typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          (error as { status?: number }).status === 404) ||
        (typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          (error as { response?: { status?: number } }).response?.status === 404);

      if (isNotFound) {
        return null;
      }

      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Devuelve la URL del endpoint de foto del usuario autenticado (WebP).
   */
  getMyPhotoUrl(userId?: string, photoUpdatedAt?: string | null): string {
    const base = userId
      ? `/api/identidad/api/v1/users/${userId}/photo`
      : '/api/identidad/api/v1/users/me/photo';
    return photoUpdatedAt ? `${base}?v=${encodeURIComponent(photoUpdatedAt)}` : base;
  },

  /**
   * Devuelve la URL de la foto del preparador físico para el atleta (WebP).
   */
  getPfPhotoUrl(pfId?: string, photoUpdatedAt?: string | null): string {
    const base = pfId
      ? `/api/identidad/api/v1/users/${pfId}/photo`
      : '/api/identidad/api/v1/users/me/pf-photo';
    return photoUpdatedAt ? `${base}?v=${encodeURIComponent(photoUpdatedAt)}` : base;
  },

  /**
   * Sube la foto de perfil en formato WebP para el usuario autenticado (KAN-512).
   */
  async uploadMyPhoto(file: File): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await httpClient.put('/identidad/api/v1/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Elimina la foto de perfil del usuario autenticado (KAN-512).
   */
  async deleteMyPhoto(): Promise<void> {
    try {
      await httpClient.delete('/identidad/api/v1/users/me/photo');
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
