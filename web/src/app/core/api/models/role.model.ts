import type { PageMeta } from './school.model';
export type { PageMeta };

export type RoleType = 'system' | 'custom';
export type RoleStatus = 'active' | 'inactive';

export interface Permission {
  code: string;
  label: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: RoleStatus;
  permissions: string[];
  usersCount: number;
  scope?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleStats {
  total: number;
  system: number;
  permissionsCount: number;
  assignedUsers: number;
  totalRoles?: number;
  systemRoles?: number;
  definedPermissions?: number;
}

export interface CreateRoleDto {
  name: string;
  code?: string;
  description?: string;
  permissions?: string[];
  scope?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  status?: RoleStatus;
  permissions?: string[];
  scope?: string;
}

export interface QueryRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: RoleType;
  status?: RoleStatus;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
