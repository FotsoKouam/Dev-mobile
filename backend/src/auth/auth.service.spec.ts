import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { User } from '../users/user.entity.js';
import { Session } from './session.entity.js';
import { AuditLog } from './audit-log.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { School } from '../schools/school.entity.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { AuthMethod } from '../users/enums/auth-method.enum.js';
import { AssignmentStatus } from '../assignments/enums/assignment-status.enum.js';
import { RoleCode } from '../roles/enums/role-code.enum.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockSessionsRepository = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
  };

  const mockAuditLogsRepository = {
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockAssignmentsRepository = {
    find: vi.fn(),
  };

  const mockSchoolsRepository = {
    findOne: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mocked-jwt-token'),
    verify: vi.fn(),
  };

  const mockDataSource = {
    query: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      switch (key) {
        case 'GOOGLE_CLIENT_ID':
          return 'test-client-id.apps.googleusercontent.com';
        case 'JWT_ACCESS_SECRET':
          return 'test-access-secret';
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret';
        case 'JWT_ACCESS_TTL':
          return '15m';
        case 'JWT_REFRESH_TTL':
          return '7d';
        default:
          return undefined;
      }
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Session), useValue: mockSessionsRepository },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogsRepository },
        { provide: getRepositoryToken(Assignment), useValue: mockAssignmentsRepository },
        { provide: getRepositoryToken(School), useValue: mockSchoolsRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('loginWithGoogle', () => {
    it('devrait rejeter (401) si le jeton Google est invalide', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(service.loginWithGoogle('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter (401) si l émetteur est invalide', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'bad-issuer.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: true,
          email: 'test@example.com',
        }),
      } as any);

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter (401) si l audience est invalide', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'wrong-audience',
          email_verified: true,
          email: 'test@example.com',
        }),
      } as any);

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter (401) si l email n est pas vérifié', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: false,
          email: 'test@example.com',
        }),
      } as any);

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter (403) si l utilisateur n existe pas en base', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: true,
          email: 'unknown@example.com',
        }),
      } as any);

      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devrait rejeter (403) si l utilisateur est inactif ou suspendu', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: true,
          email: 'suspended@example.com',
        }),
      } as any);

      mockUsersRepository.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'suspended@example.com',
        authMethod: AuthMethod.GOOGLE,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devrait rejeter (403) si l utilisateur n a aucune affectation active', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: true,
          email: 'active@example.com',
        }),
      } as any);

      mockUsersRepository.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'active@example.com',
        authMethod: AuthMethod.GOOGLE,
        status: UserStatus.ACTIVE,
      });

      mockAssignmentsRepository.find.mockResolvedValue([]);

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devrait rejeter (403) si l école exige un domaine différent', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: true,
          email: 'user@gmail.com',
        }),
      } as any);

      mockUsersRepository.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'user@gmail.com',
        authMethod: AuthMethod.GOOGLE,
        status: UserStatus.ACTIVE,
      });

      mockAssignmentsRepository.find.mockResolvedValue([
        {
          id: 'a-1',
          school: { googleWorkspaceDomain: 'saintjean.cm' },
        },
      ]);

      await expect(service.loginWithGoogle('valid-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devrait connecter avec succès un utilisateur valide et passer invited à active', async () => {
      vi.spyOn((service as any).oauthClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-client-id.apps.googleusercontent.com',
          email_verified: true,
          email: 'paul.essiane@saintjean.cm',
        }),
      } as any);

      const user = {
        id: 'u-1',
        email: 'paul.essiane@saintjean.cm',
        firstName: 'Paul',
        lastName: 'Essiane',
        authMethod: AuthMethod.GOOGLE,
        status: UserStatus.INVITED,
      };

      mockUsersRepository.findOne.mockResolvedValue(user);
      mockAssignmentsRepository.find.mockResolvedValue([
        {
          id: 'a-1',
          status: AssignmentStatus.ACTIVE,
          role: { code: RoleCode.STAFF },
          school: { googleWorkspaceDomain: 'saintjean.cm' },
        },
      ]);

      mockSessionsRepository.create.mockReturnValue({ id: 's-1', userId: 'u-1' });
      mockSessionsRepository.save.mockResolvedValue({ id: 's-1', userId: 'u-1' });

      const res = await service.loginWithGoogle('valid-token');

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(res.accessToken).toBe('mocked-jwt-token');
      expect(res.user.email).toBe('paul.essiane@saintjean.cm');
    });
  });

  describe('loginWithPassword', () => {
    it('devrait refuser (401) si utilisateur absent ou mot de passe incorrect avec message générique', async () => {
      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      mockUsersRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.loginWithPassword('admin@example.com', 'wrong-pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait connecter avec succès un admin avec bon mot de passe', async () => {
      const password = 'correct-password';
      const hash = await argon2.hash(password);

      const user = {
        id: 'admin-1',
        email: 'admin@example.com',
        firstName: 'Fatso',
        lastName: 'Admin',
        authMethod: AuthMethod.PASSWORD,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
      };

      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(user),
      };
      mockUsersRepository.createQueryBuilder.mockReturnValue(qb);

      mockAssignmentsRepository.find.mockResolvedValue([
        {
          id: 'a-1',
          status: AssignmentStatus.ACTIVE,
          role: { code: RoleCode.PLATFORM_ADMIN },
        },
      ]);

      mockSessionsRepository.create.mockReturnValue({ id: 's-1', userId: 'admin-1' });
      mockSessionsRepository.save.mockResolvedValue({ id: 's-1', userId: 'admin-1' });

      const res = await service.loginWithPassword('admin@example.com', password);

      expect(res.accessToken).toBe('mocked-jwt-token');
      expect(res.user.id).toBe('admin-1');
    });

    it('devrait verrouiller (429) après 5 échecs consécutifs', async () => {
      const email = 'lockout@example.com';
      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      mockUsersRepository.createQueryBuilder.mockReturnValue(qb);

      for (let i = 0; i < 5; i++) {
        await expect(service.loginWithPassword(email, 'bad')).rejects.toThrow(
          UnauthorizedException,
        );
      }

      // La 6ème tentative doit renvoyer 429
      await expect(service.loginWithPassword(email, 'bad')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('refresh', () => {
    it('devrait rejeter un refresh token si la session est révoquée', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'u-1', sid: 's-1' });
      mockSessionsRepository.findOne.mockResolvedValue({
        id: 's-1',
        userId: 'u-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
