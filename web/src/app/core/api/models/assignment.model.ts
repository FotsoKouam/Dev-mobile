import type { PageMeta } from './school.model';
import type { UserRole } from './user.model';
export type { PageMeta };

export type AssignmentStatus = 'active' | 'inactive';
export type RoleCode = UserRole;

export interface AssignmentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AssignmentRole {
  id: string;
  code: RoleCode;
  name: string;
}

export interface AssignmentSchool {
  id: string;
  name: string;
}

export interface AssignmentProgram {
  id: string;
  name: string;
}

export interface Assignment {
  id: string;
  user: AssignmentUser;
  role: AssignmentRole;
  school: AssignmentSchool | null;
  program: AssignmentProgram | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  spacesCount?: number;
}

export interface AssignmentStats {
  total: number;
  users: number;
  schools: number;
  programs: number;
}

export interface CreateAssignmentDto {
  userId: string;
  roleCode: RoleCode;
  schoolId?: string;
  programId?: string;
}

export interface UpdateAssignmentDto {
  schoolId?: string;
  programId?: string;
  status?: AssignmentStatus;
}

export interface QueryAssignmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  programId?: string;
  roleCode?: string;
  status?: AssignmentStatus;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
