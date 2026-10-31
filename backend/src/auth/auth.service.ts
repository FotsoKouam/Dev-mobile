import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import * as argon2 from 'argon2';
import { User } from '../users/user.entity.js';
import { Session } from './session.entity.js';
import { AuditLog } from './audit-log.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { School } from '../schools/school.entity.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { AuthMethod } from '../users/enums/auth-method.enum.js';
import { AssignmentStatus } from '../assignments/enums/assignment-status.enum.js';
import { RoleCode } from '../roles/enums/role-code.enum.js';
import { ALL_PERMISSION_CODES } from '../roles/permissions.constant.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';

interface LoginAttemptRecord {
  count: number;
  blockedUntil?: number;
  firstAttemptAt: number;
}

@Injectable()
export class AuthService {
  private readonly oauthClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtAccessTtl: string;
  private readonly jwtRefreshTtl: string;

  // Limitation de tentatives en mémoire : email -> LoginAttemptRecord
  private readonly loginAttempts = new Map<string, LoginAttemptRecord>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
    private readonly dataSource: DataSource,
  ) {
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.jwtAccessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || '';
    this.jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || '';
    this.jwtAccessTtl = this.configService.get<string>('JWT_ACCESS_TTL') || '15m';
    this.jwtRefreshTtl = this.configService.get<string>('JWT_REFRESH_TTL') || '7d';

    this.oauthClient = new OAuth2Client(this.googleClientId);
  }

  /**
   * Connexion via Google OAuth2 ID Token
   */
  async loginWithGoogle(
    idToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    let payload;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      await this.logAudit(null, 'login_failed', 'google_token_invalid', ipAddress, userAgent);
      throw new UnauthorizedException('Authentication failed');
    }

    if (!payload) {
      await this.logAudit(null, 'login_failed', 'google_empty_payload', ipAddress, userAgent);
      throw new UnauthorizedException('Authentication failed');
    }

    // 1. Vérifier émetteur
    const issuer = payload.iss;
    if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
      await this.logAudit(null, 'login_failed', 'invalid_issuer', ipAddress, userAgent);
      throw new UnauthorizedException('Authentication failed');
    }

    // 2. Vérifier audience
    if (payload.aud !== this.googleClientId) {
      await this.logAudit(null, 'login_failed', 'invalid_audience', ipAddress, userAgent);
      throw new UnauthorizedException('Authentication failed');
    }

    // 3. Exiger email_verified = true
    if (!payload.email_verified || !payload.email) {
      await this.logAudit(null, 'login_failed', payload.email ?? 'unverified_email', ipAddress, userAgent);
      throw new UnauthorizedException('Authentication failed');
    }

    const email = payload.email.trim().toLowerCase();

    // 4. Chercher l'utilisateur interne
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      await this.logAudit(null, 'login_failed', email, ipAddress, userAgent);
      throw new ForbiddenException("Ce compte n'est pas invité sur ce portail.");
    }

    // 5. Vérifier authMethod = google
    if (user.authMethod !== AuthMethod.GOOGLE) {
      await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
      throw new ForbiddenException("Ce compte n'est pas configuré pour une connexion Google.");
    }

    // 6. Vérifier le statut
    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
      throw new ForbiddenException(
        'Votre accès est suspendu. Contactez l\'administrateur de votre école.',
      );
    }

    if (user.status === UserStatus.INVITED) {
      user.status = UserStatus.ACTIVE;
      await this.usersRepository.save(user);
    }

    // 7. Vérifier au moins une affectation active
    const activeAssignments = await this.assignmentsRepository.find({
      where: { userId: user.id, status: AssignmentStatus.ACTIVE },
      relations: ['school'],
    });

    if (activeAssignments.length === 0) {
      await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
      throw new ForbiddenException('Aucune affectation active pour cet utilisateur.');
    }

    // 8. Vérifier le domaine si renseigné sur l'école
    for (const assignment of activeAssignments) {
      if (assignment.school?.googleWorkspaceDomain) {
        const domain = assignment.school.googleWorkspaceDomain.trim().toLowerCase();
        const userDomain = email.split('@')[1];
        if (userDomain !== domain) {
          await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
          throw new ForbiddenException(`L'email doit appartenir au domaine ${domain}`);
        }
      }
    }

    // 9. Créer session, tokens, lastLoginAt et audit_log
    const permissions = await this.getUserPermissions(user.id);
    const session = await this.createSession(user.id, ipAddress, userAgent);

    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    await this.logAudit(user.id, 'login_success', email, ipAddress, userAgent);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
      permissions,
    };
  }

  /**
   * Connexion administrateur par email et mot de passe
   */
  async loginWithPassword(
    emailInput: string,
    passwordInput: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const email = emailInput.trim().toLowerCase();

    // Vérification de limitation des tentatives (Rate limit: 5 échecs en 15m)
    this.checkRateLimit(email);

    const genericError = new UnauthorizedException('Email ou mot de passe incorrect.');

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email })
      .getOne();

    if (!user || user.authMethod !== AuthMethod.PASSWORD || !user.passwordHash) {
      this.recordFailedAttempt(email);
      await this.logAudit(null, 'login_failed', email, ipAddress, userAgent);
      throw genericError;
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.passwordHash, passwordInput);
    } catch {
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      this.recordFailedAttempt(email);
      await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
      throw genericError;
    }

    // Réinitialiser les tentatives en cas de succès
    this.resetAttempts(email);

    // Vérifier statut
    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
      throw new ForbiddenException(
        'Votre accès est suspendu. Contactez l\'administrateur de votre école.',
      );
    }

    if (user.status === UserStatus.INVITED) {
      user.status = UserStatus.ACTIVE;
      await this.usersRepository.save(user);
    }

    // Vérifier au moins une affectation active
    const activeAssignments = await this.assignmentsRepository.find({
      where: { userId: user.id, status: AssignmentStatus.ACTIVE },
    });

    if (activeAssignments.length === 0) {
      await this.logAudit(user.id, 'login_failed', email, ipAddress, userAgent);
      throw new ForbiddenException('Aucune affectation active pour cet utilisateur.');
    }

    const permissions = await this.getUserPermissions(user.id);
    const session = await this.createSession(user.id, ipAddress, userAgent);

    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    await this.logAudit(user.id, 'login_success', email, ipAddress, userAgent);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
      permissions,
    };
  }

  /**
   * Rafraîchissement d'un token (rotation)
   */
  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload?.sub || !payload?.sid) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const session = await this.sessionsRepository.findOne({
      where: { id: payload.sid, userId: payload.sub },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session is expired or revoked');
    }

    let isTokenMatch = false;
    try {
      isTokenMatch = await argon2.verify(session.refreshTokenHash, refreshToken);
    } catch {
      isTokenMatch = false;
    }

    if (!isTokenMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Faire tourner le refresh token (rotation)
    const newSession = await this.rotateSession(session, ipAddress, userAgent);
    return {
      accessToken: newSession.accessToken,
      refreshToken: newSession.refreshToken,
    };
  }

  /**
   * Déconnexion (révocation de la session)
   */
  async logout(sessionId: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const session = await this.sessionsRepository.findOne({ where: { id: sessionId } });
    if (session) {
      session.revokedAt = new Date();
      await this.sessionsRepository.save(session);
    }
    await this.logAudit(userId ?? null, 'logout', sessionId, ipAddress, userAgent);
  }

  /**
   * Récupération des permissions et profil courant
   */
  async getMe(userId: string) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.assignments', 'assignment')
      .leftJoinAndSelect('assignment.role', 'role')
      .leftJoinAndSelect('assignment.school', 'school')
      .leftJoinAndSelect('assignment.program', 'program')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.getUserPermissions(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      authMethod: user.authMethod,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      assignments: (user.assignments || []).map((a: Assignment) => ({
        id: a.id,
        role: {
          id: a.role?.id ?? a.roleId,
          code: a.role?.code,
          name: a.role?.name,
        },
        school: a.school ? { id: a.school.id, name: a.school.name } : null,
        program: a.program ? { id: a.program.id, name: a.program.name } : null,
        status: a.status,
      })),
      permissions,
      createdAt:
        user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      updatedAt:
        user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
    };
  }

  /**
   * Calcule les permissions d'un utilisateur à partir de ses affectations actives
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const assignments = await this.assignmentsRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['role'],
    });

    if (assignments.length === 0) {
      return [];
    }

    // Si platform_admin -> les 10 permissions
    if (assignments.some((a) => a.role?.code === RoleCode.PLATFORM_ADMIN)) {
      return [...ALL_PERMISSION_CODES];
    }

    const roleIds = assignments.map((a) => a.roleId).filter(Boolean);
    if (roleIds.length === 0) {
      return [];
    }

    const perms = await this.dataSource.query(
      `SELECT DISTINCT permission_code FROM role_permissions WHERE role_id = ANY($1)`,
      [roleIds],
    );

    return perms.map((r: { permission_code: string }) => r.permission_code);
  }

  private async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = this.sessionsRepository.create({
      userId,
      refreshTokenHash: 'pending',
      expiresAt: new Date(Date.now() + this.parseTtl(this.jwtRefreshTtl)),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    const savedSession = await this.sessionsRepository.save(session);

    const accessToken = this.jwtService.sign(
      { sub: userId, sid: savedSession.id },
      {
        secret: this.jwtAccessSecret,
        expiresIn: this.jwtAccessTtl as import('ms').StringValue,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, sid: savedSession.id },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshTtl as import('ms').StringValue,
      },
    );

    savedSession.refreshTokenHash = await argon2.hash(refreshToken);
    await this.sessionsRepository.save(savedSession);

    return { accessToken, refreshToken };
  }

  private async rotateSession(
    session: Session,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(
      { sub: session.userId, sid: session.id },
      {
        secret: this.jwtAccessSecret,
        expiresIn: this.jwtAccessTtl as import('ms').StringValue,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: session.userId, sid: session.id },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshTtl as import('ms').StringValue,
      },
    );

    session.refreshTokenHash = await argon2.hash(refreshToken);
    session.expiresAt = new Date(Date.now() + this.parseTtl(this.jwtRefreshTtl));
    if (ipAddress) session.ipAddress = ipAddress;
    if (userAgent) session.userAgent = userAgent;

    await this.sessionsRepository.save(session);

    return { accessToken, refreshToken };
  }

  private async logAudit(
    actorUserId: string | null,
    action: string,
    target?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const log = this.auditLogsRepository.create({
        actorUserId: actorUserId ?? null,
        action,
        target: target ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      await this.auditLogsRepository.save(log);
    } catch {
      // Ignorer l'erreur d'audit pour ne pas bloquer le flux principal
    }
  }

  private checkRateLimit(email: string): void {
    const record = this.loginAttempts.get(email);
    if (!record) return;

    const now = Date.now();
    if (record.blockedUntil && now < record.blockedUntil) {
      throw new HttpException(
        'Trop de tentatives échouées. Veuillez réessayer dans 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (now - record.firstAttemptAt > 15 * 60 * 1000) {
      this.loginAttempts.delete(email);
    }
  }

  private recordFailedAttempt(email: string): void {
    const now = Date.now();
    const record = this.loginAttempts.get(email) ?? {
      count: 0,
      firstAttemptAt: now,
    };

    if (now - record.firstAttemptAt > 15 * 60 * 1000) {
      record.count = 1;
      record.firstAttemptAt = now;
      record.blockedUntil = undefined;
    } else {
      record.count += 1;
    }

    if (record.count >= 5) {
      record.blockedUntil = now + 15 * 60 * 1000;
    }

    this.loginAttempts.set(email, record);
  }

  private resetAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }

  private parseTtl(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
