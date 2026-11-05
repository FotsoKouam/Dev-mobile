export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export type SchoolType = 'public' | 'private';
export type EntityStatus = 'active' | 'inactive';

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  city: string;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  googleWorkspaceDomain?: string | null;
  mainLanguage?: string;
  status: EntityStatus;
  programsCount: number;
  usersCount: number;
  spacesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  schoolId: string;
  name: string;
  description?: string | null;
  status: EntityStatus;
  usersCount: number;
  spacesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatItem {
  active: number;
  total: number;
}

export interface SchoolStats {
  schools: StatItem;
  programs: StatItem;
  users: StatItem;
  institutionalSpaces: StatItem;
}

export interface QuerySchoolsParams {
  page?: number;
  limit?: number;
  status?: EntityStatus | '';
  type?: SchoolType | '';
  search?: string;
}

export interface CreateSchoolDto {
  name: string;
  type: SchoolType;
  city: string;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  googleWorkspaceDomain?: string | null;
  mainLanguage?: string;
}

export interface UpdateSchoolDto {
  name?: string;
  type?: SchoolType;
  city?: string;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  googleWorkspaceDomain?: string | null;
  mainLanguage?: string;
  status?: EntityStatus;
}

export interface QueryProgramsParams {
  page?: number;
  limit?: number;
  status?: EntityStatus | '';
}

export interface CreateProgramDto {
  name: string;
  description?: string | null;
}

export interface UpdateProgramDto {
  name?: string;
  description?: string | null;
  status?: EntityStatus;
}

