import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Role } from './role.entity.js';
import { RoleCode } from './enums/role-code.enum.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { QueryRoleDto } from './dto/query-role.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { RoleStatus } from './enums/role-status.enum.js';
import { ALL_PERMISSION_CODES } from './permissions.constant.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryRoleDto): Promise<PaginatedResponseDto<RoleResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.rolesRepository.createQueryBuilder('role');

    if (query.status) {
      qb.andWhere('role.status = :status', { status: query.status });
    }

    if (query.type === 'system') {
      qb.andWhere('role.is_system = :isSystem', { isSystem: true });
    } else if (query.type === 'custom') {
      qb.andWhere('role.is_system = :isSystem', { isSystem: false });
    }

    qb.orderBy('role.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [roles, total] = await qb.getManyAndCount();

    const data: RoleResponseDto[] = [];
    for (const role of roles) {
      const permissions = await this.getPermissionsForRole(role.id);
      const usersCount = await this.countUsersWithRole(role.id);
      data.push(this.toResponseDto(role, permissions, usersCount));
    }

    return {
      data,
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    const permissions = await this.getPermissionsForRole(role.id);
    const usersCount = await this.countUsersWithRole(role.id);
    return this.toResponseDto(role, permissions, usersCount);
  }

  async findByCode(code: RoleCode): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { code } });
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const name = dto.name.trim();

    // Custom role code
    const code = RoleCode.CUSTOM;

    const role = this.rolesRepository.create({
      code,
      name,
      description: dto.description ?? null,
      isSystem: false,
      status: RoleStatus.ACTIVE,
    });

    const saved = await this.rolesRepository.save(role);

    if (dto.permissions && dto.permissions.length > 0) {
      await this.setPermissionsForRole(saved.id, dto.permissions);
    }

    const permissions = await this.getPermissionsForRole(saved.id);
    return this.toResponseDto(saved, permissions, 0);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot modify a system role');
    }

    if (dto.name !== undefined) {
      role.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      role.description = dto.description;
    }
    if (dto.status !== undefined) {
      role.status = dto.status;
    }

    await this.rolesRepository.save(role);

    if (dto.permissions !== undefined) {
      await this.setPermissionsForRole(role.id, dto.permissions);
    }

    const permissions = await this.getPermissionsForRole(role.id);
    const usersCount = await this.countUsersWithRole(role.id);
    return this.toResponseDto(role, permissions, usersCount);
  }

  private async getPermissionsForRole(roleId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT permission_code FROM role_permissions WHERE role_id = $1 ORDER BY permission_code ASC`,
      [roleId],
    );
    return rows.map((r: { permission_code: string }) => r.permission_code);
  }

  private async setPermissionsForRole(roleId: string, permissions: string[]): Promise<void> {
    const validPermissions = permissions.filter((p) => ALL_PERMISSION_CODES.includes(p));

    await this.dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

    for (const perm of validPermissions) {
      await this.dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, perm],
      );
    }
  }

  private async countUsersWithRole(roleId: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM assignments WHERE role_id = $1 AND status = 'active'`,
      [roleId],
    );
    return Number(result[0]?.count ?? 0);
  }

  private toResponseDto(
    role: Role,
    permissions: string[],
    usersCount: number,
  ): RoleResponseDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      status: role.status,
      permissions,
      usersCount,
      createdAt:
        role.createdAt instanceof Date ? role.createdAt.toISOString() : String(role.createdAt),
      updatedAt:
        role.updatedAt instanceof Date ? role.updatedAt.toISOString() : String(role.updatedAt),
    };
  }
}
