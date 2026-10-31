import {
  generateCategoryInvitationToken,
  validateCategoryInvitationToken,
} from './generated/estructura';
import { extractErrorMessage } from './axiosClient';
import { CategoryInvitation } from '../types/structure';

// Ruta relativa de la landing para atletas (KAN-398).
export const INVITATION_LANDING_PATH = '/invite';

export function buildInvitationUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${INVITATION_LANDING_PATH}/${token}`;
}

export const categoryInvitationsService = {
  // Genera un token de invitación de 7 días para la categoría indicada (KAN-400).
  async generate(categoryId: string): Promise<CategoryInvitation> {
    try {
      const { data } = await generateCategoryInvitationToken({
        path: { id: categoryId },
        throwOnError: true,
      });

      return {
        token: data.token,
        expiresAt: data.expiresAt,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        invitationUrl: data.invitationUrl || buildInvitationUrl(data.token),
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  // Valida un token de invitación (público, para la landing de registro de atleta KAN-398).
  async validate(token: string): Promise<CategoryInvitation> {
    try {
      const { data } = await validateCategoryInvitationToken({
        path: { token },
        throwOnError: true,
      });

      return {
        token: data.token,
        expiresAt: data.expiresAt,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        invitationUrl: data.invitationUrl || buildInvitationUrl(data.token),
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
