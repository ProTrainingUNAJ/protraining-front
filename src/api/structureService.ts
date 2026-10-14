/**
 * @deprecated Use directly the modular API endpoints:
 * - import { getOrganizations, createOrganization } from './organizations';
 * - import { getCategories, createCategory } from './categories';
 * - import { getAthletes, createAthlete, assignAthleteCategory, unassignAthleteCategory } from './athletes';
 */

import { getOrganizations, createOrganization } from './organizations';
import { getCategories, createCategory } from './categories';
import {
  getAthletes,
  createAthlete,
  assignAthleteCategory,
  unassignAthleteCategory,
} from './athletes';

export const structureService = {
  getOrganizations,
  createOrganization,
  getCategories,
  createCategory,
  getAthletes,
  createAthlete,
  assignAthleteCategory,
  unassignAthleteCategory,
};
