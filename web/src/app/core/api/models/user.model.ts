import { PageMeta } from './school.model';
export type { PageMeta };

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'invited';

export type UserRole =
  | 'platform_admin'
  | 'school_admin'
  | 'staff'
  | 'student'
  | 'guest';

export type AuthMethod = 'google' | 'password';

export interface AssignmentRole {
  id: string;
  code: UserRole;
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

export interface UserAssignmentItem {
  id: string;
  role: AssignmentRole;
  school: AssignmentSchool | null;
  program: AssignmentProgram | null;
  status: 'active' | 'inactive';
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  authMethod: AuthMethod;
  status: UserStatus;
  lastLoginAt: string | null;
  assignments: UserAssignmentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UserStatsUsersCount {
  active: number;
  total: number;
}

export interface UserStatsByRoleCount {
  platform_admin: number;
  school_admin: number;
  staff: number;
  student: number;
  guest: number;
}

export interface UserStats {
  users: UserStatsUsersCount;
  byRole: UserStatsByRoleCount;
}

export interface UserAssignmentPayload {
  roleCode: UserRole;
  schoolId?: string;
  programId?: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  authMethod: AuthMethod;
  assignment?: UserAssignmentPayload;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: UserStatus;
}

export interface QueryUserParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  roleCode?: UserRole;
  schoolId?: string;
  programId?: string;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
