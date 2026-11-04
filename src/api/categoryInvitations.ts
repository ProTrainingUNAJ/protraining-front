import {
  generateCategoryInvitationToken,
  validateCategoryInvitationToken,
} from './generated/estructura';
import { extractErrorMessage } from './axiosClient';
import { CategoryInvitation } from '../types/structure';

// Landing path for athlete enrollment (KAN-398).
export const INVITATION_LANDING_PATH = '/invite';
export const INVITATION_STORAGE_PREFIX = 'protraining_category_invitation_';

export function buildInvitationUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${INVITATION_LANDING_PATH}/${token}`;
}

export function getCachedInvitation(categoryId: string): CategoryInvitation | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const raw = window.localStorage.getItem(`${INVITATION_STORAGE_PREFIX}${categoryId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CategoryInvitation;
    if (!parsed || !parsed.token || !parsed.expiresAt) return null;

    const expiresTime = new Date(parsed.expiresAt).getTime();
    if (Number.isNaN(expiresTime)) return null;

    // Consider valid if at least 60 seconds remain before expiration
    if (expiresTime > Date.now() + 60 * 1000) {
      if (!parsed.invitationUrl) {
        parsed.invitationUrl = buildInvitationUrl(parsed.token);
      }
      return parsed;
    }

    // Clean up expired entry
    window.localStorage.removeItem(`${INVITATION_STORAGE_PREFIX}${categoryId}`);
  } catch {
    // Gracefully handle restricted storage or malformed JSON
  }
  return null;
}

export function storeCachedInvitation(invitation: CategoryInvitation): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        `${INVITATION_STORAGE_PREFIX}${invitation.categoryId}`,
        JSON.stringify(invitation),
      );
    }
  } catch {
    // Silently handle quota exceeded or storage disabled
  }
}

export function clearCachedInvitation(categoryId: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`${INVITATION_STORAGE_PREFIX}${categoryId}`);
    }
  } catch {
    // Silently handle storage disabled
  }
}

export const categoryInvitationsService = {
  // Reuses the latest active token if still valid; generates a new one if expired or forced.
  async getOrGenerate(
    categoryId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<CategoryInvitation> {
    if (!options?.forceRefresh) {
      const cached = getCachedInvitation(categoryId);
      if (cached) {
        return cached;
      }
    }

    return this.generate(categoryId);
  },

  // Generates a 7-day invitation token for the category and caches it (KAN-400).
  async generate(categoryId: string): Promise<CategoryInvitation> {
    try {
      const { data } = await generateCategoryInvitationToken({
        path: { id: categoryId },
        throwOnError: true,
      });

      const invitation: CategoryInvitation = {
        token: data.token,
        expiresAt: data.expiresAt,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        invitationUrl: data.invitationUrl || buildInvitationUrl(data.token),
      };

      storeCachedInvitation(invitation);
      return invitation;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  clearCached(categoryId: string): void {
    clearCachedInvitation(categoryId);
  },

  // Validates an invitation token (public endpoint for athlete enrollment landing KAN-398).
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
