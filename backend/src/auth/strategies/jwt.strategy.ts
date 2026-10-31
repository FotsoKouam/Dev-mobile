import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity.js';
import { Session } from '../session.entity.js';
import { AuthService } from '../auth.service.js';
import { Assignment } from '../../assignments/assignment.entity.js';
import { AssignmentStatus } from '../../assignments/enums/assignment-status.enum.js';
import { RoleCode } from '../../roles/enums/role-code.enum.js';

export interface JwtPayload {
  sub: string;
  sid: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'temporary-fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId, sid: sessionId } = payload;

    // 1. Vérifier la session en base
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session is expired or revoked');
    }

    // 2. Vérifier l'utilisateur
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Charger les permissions dynamiquement à chaque requête
    const permissions = await this.authService.getUserPermissions(userId);

    // 4. Identifier l'école de rattachement pour school_admin
    const activeAssignments = await this.assignmentsRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['role'],
    });

    const isPlatformAdmin = activeAssignments.some(
      (a) => a.role?.code === RoleCode.PLATFORM_ADMIN,
    );
    const schoolAdminAssignment = activeAssignments.find(
      (a) => a.role?.code === RoleCode.SCHOOL_ADMIN,
    );

    return Object.assign(user, {
      sessionId,
      permissions,
      isPlatformAdmin,
      schoolId: isPlatformAdmin ? null : (schoolAdminAssignment?.schoolId ?? null),
    });
  }
}

