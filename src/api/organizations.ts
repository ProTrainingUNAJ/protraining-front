import { listOrganizations } from './generated/estructura';
import { extractErrorMessage } from './axiosClient';
import { Organization } from '../types/structure';

export const organizationsService = {
  async list(): Promise<Organization[]> {
    const { data, error } = await listOrganizations();
    if (error) throw new Error(extractErrorMessage(error));
    return (data ?? []).map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description ?? null,
      categoriesCount: 0,
    }));
  },
};
