import type { PageMeta } from './school.model';
export type { PageMeta };

export type SpaceType = 'institutional' | 'personal';
export type SpaceStatus = 'active' | 'inactive';

export interface SpaceSchoolSummary {
  id: string;
  name: string;
}

export interface SpaceProgramSummary {
  id: string;
  name: string;
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  type: SpaceType;
  status: SpaceStatus;
  school: SpaceSchoolSummary;
  program: SpaceProgramSummary;
  createdAt: string;
  updatedAt: string;
}

export interface QuerySpacesParams {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  programId?: string;
  status?: SpaceStatus;
}

export interface CreateSpaceDto {
  name: string;
  description?: string;
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  status?: SpaceStatus;
}

