import {
  generateCategoryInvitationToken,
  validateCategoryInvitationToken,
  acceptCategoryInvitation as acceptCategoryInvitationApi,
  type AcceptCategoryInvitationRequest,
} from './generated/estructura';
import axios from 'axios';
import { extractErrorMessage } from './axiosClient';
import { CategoryInvitation, Athlete } from '../types/structure';

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

  // Accepts an invitation for an authenticated athlete and registers their athlete profile (KAN-398 / KAN-401).
  async accept(token: string, payload: AcceptCategoryInvitationRequest): Promise<Athlete> {
    try {
      const { data } = await acceptCategoryInvitationApi({
        path: { token },
        body: payload,
        throwOnError: true,
      });

      return data as unknown as Athlete;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};

/**
 * Extracts HTTP status code from any error representation (Axios, OpenAPI client, or nested cause).
 */
export function getHttpErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  if (error && typeof error === 'object') {
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      return (error as { status: number }).status;
    }
    if (
      'response' in error &&
      typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
    ) {
      return (error as { response: { status: number } }).response.status;
    }
    if ('cause' in error && error.cause) {
      return getHttpErrorStatus(error.cause);
    }
  }
  return undefined;
}
