import type { PageMeta } from './school.model';
export type { PageMeta };

export type SpaceScope = 'school' | 'program' | 'role' | 'individual';
export type SpaceStatus = 'active' | 'inactive';

export interface SpaceSchoolSummary {
  id: string;
  name: string;
}

export interface SpaceProgramSummary {
  id: string;
  name: string;
}

export interface SpaceMemberUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  user: SpaceMemberUserSummary;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  scope: SpaceScope;
  scopeProgramId?: string | null;
  scopeProgram?: SpaceProgramSummary | null;
  scopeRoleCode?: string | null;
  status: SpaceStatus;
  school: SpaceSchoolSummary;
  createdAt: string;
  updatedAt: string;
}

export interface QuerySpacesParams {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  scope?: SpaceScope;
  status?: SpaceStatus;
}

export interface CreateSpaceDto {
  name: string;
  description?: string;
  scope: SpaceScope;
  programId?: string;
  roleCode?: string;
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  status?: SpaceStatus;
  scope?: SpaceScope;
  programId?: string;
  roleCode?: string;
}

export interface AddSpaceMemberDto {
  userId: string;
}
