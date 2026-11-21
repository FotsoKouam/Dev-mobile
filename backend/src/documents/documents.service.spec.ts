import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { DocumentsService, UploadedFilePayload, UserContext } from './documents.service.js';
import { Document } from './document.entity.js';
import { DocumentVersion } from './document-version.entity.js';
import { Space } from '../spaces/space.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { AuditLog } from '../audit/audit-log.entity.js';
import { StorageService } from './storage/storage.service.js';
import { DocumentFileType, DocumentStatus } from './document.enums.js';
import { SpaceStatus } from '../spaces/space.enums.js';
import { DocumentStatusService } from './document-status.service.js';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentStatusService: DocumentStatusService;
  let documentsRepo: Partial<Record<keyof Repository<Document>, any>>;
  let versionsRepo: Partial<Record<keyof Repository<DocumentVersion>, any>>;
  let spacesRepo: Partial<Record<keyof Repository<Space>, any>>;
  let assignmentsRepo: Partial<Record<keyof Repository<Assignment>, any>>;
  let auditLogsRepo: Partial<Record<keyof Repository<AuditLog>, any>>;
  let storageService: Partial<Record<keyof StorageService, any>>;
  let dataSource: Partial<Record<keyof DataSource, any>>;
  let ingestionService: any;

  beforeEach(() => {
    documentsRepo = {
      create: vi.fn((dto) => ({ id: 'doc-1', ...dto })),
      save: vi.fn((doc) => Promise.resolve({ id: 'doc-1', ...doc })),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    versionsRepo = {
      create: vi.fn((dto) => ({ id: 'ver-1', ...dto })),
      save: vi.fn((ver) => Promise.resolve({ id: 'ver-1', ...ver })),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    spacesRepo = {
      createQueryBuilder: vi.fn(),
    };

    assignmentsRepo = {
      createQueryBuilder: vi.fn(),
    };

    auditLogsRepo = {
      create: vi.fn((dto) => ({ id: 'audit-1', ...dto })),
      save: vi.fn((log) => Promise.resolve({ id: 'audit-1', ...log })),
    };

    storageService = {
      getMaxUploadMb: vi.fn().mockReturnValue(20),
      saveFile: vi.fn().mockResolvedValue('/storage/file.pdf'),
      readFile: vi.fn().mockReturnValue(Buffer.from('%PDF-1.4 sample content')),
    };

    dataSource = {
      createQueryRunner: vi.fn(),
    };

    ingestionService = {
      process: vi.fn().mockResolvedValue(undefined),
    };

    documentStatusService = new DocumentStatusService(documentsRepo as any);

    service = new DocumentsService(
      documentsRepo as any,
      versionsRepo as any,
      spacesRepo as any,
      assignmentsRepo as any,
      auditLogsRepo as any,
      storageService as any,
      dataSource as any,
      ingestionService as any,
      documentStatusService as any,
    );
  });

  describe('setStatus', () => {
    it('accepte les transitions autorisées : pending -> available, available -> error, error -> pending', async () => {
      // 1. pending -> available
      documentsRepo.findOne = vi.fn().mockResolvedValue({ id: 'doc-1', status: DocumentStatus.PENDING });
      const res1 = await service.setStatus('doc-1', DocumentStatus.AVAILABLE);
      expect(res1.status).toBe(DocumentStatus.AVAILABLE);

      // 2. available -> error
      documentsRepo.findOne = vi.fn().mockResolvedValue({ id: 'doc-1', status: DocumentStatus.AVAILABLE });
      const res2 = await service.setStatus('doc-1', DocumentStatus.ERROR, 'Erreur disque');
      expect(res2.status).toBe(DocumentStatus.ERROR);
      expect(res2.errorMessage).toBe('Erreur disque');

      // 3. error -> pending
      documentsRepo.findOne = vi.fn().mockResolvedValue({ id: 'doc-1', status: DocumentStatus.ERROR, errorMessage: 'Erreur' });
      const res3 = await service.setStatus('doc-1', DocumentStatus.PENDING);
      expect(res3.status).toBe(DocumentStatus.PENDING);
      expect(res3.errorMessage).toBeNull();
    });

    it('rejette les transitions interdites (ex: available -> pending, pending -> indexing)', async () => {
      documentsRepo.findOne = vi.fn().mockResolvedValue({ id: 'doc-1', status: DocumentStatus.AVAILABLE });
      await expect(service.setStatus('doc-1', DocumentStatus.PENDING)).rejects.toThrow(BadRequestException);

      documentsRepo.findOne = vi.fn().mockResolvedValue({ id: 'doc-1', status: DocumentStatus.PENDING });
      await expect(service.setStatus('doc-1', DocumentStatus.INDEXING)).rejects.toThrow(BadRequestException);
    });
  });

  describe('upload', () => {
    it('le document passe automatiquement à available après création', async () => {
      const spaceMock = {
        id: 'space-1',
        status: SpaceStatus.ACTIVE,
        programId: 'prog-1',
      };
      const spaceQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(spaceMock),
      };
      spacesRepo.createQueryBuilder = vi.fn().mockReturnValue(spaceQbMock);

      // findOne pour le doc créé
      documentsRepo.findOne = vi.fn().mockImplementation(() =>
        Promise.resolve({
          id: 'doc-1',
          name: 'test.pdf',
          status: DocumentStatus.PENDING,
          spaceId: 'space-1',
        }),
      );

      const findOneDocQb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'doc-1',
          name: 'test.pdf',
          fileType: DocumentFileType.PDF,
          status: DocumentStatus.AVAILABLE,
          spaceId: 'space-1',
          uploadedById: 'user-1',
          currentVersion: { versionNumber: 1, sizeBytes: 100 },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(findOneDocQb);

      const file: UploadedFilePayload = {
        buffer: Buffer.from('%PDF-1.4 file data'),
        originalname: 'test.pdf',
        size: 100,
      };
      const user: UserContext = { id: 'user-1', roles: ['platform_admin'] };

      const result = await service.upload('space-1', file, { name: 'test.pdf' }, user);
      expect(result.status).toBe(DocumentStatus.AVAILABLE);
      expect(storageService.saveFile).toHaveBeenCalled();
    });

    it('pose le statut error si l écriture sur disque échoue après la création des lignes', async () => {
      const spaceMock = {
        id: 'space-1',
        status: SpaceStatus.ACTIVE,
        programId: 'prog-1',
      };
      const spaceQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(spaceMock),
      };
      spacesRepo.createQueryBuilder = vi.fn().mockReturnValue(spaceQbMock);

      documentsRepo.findOne = vi.fn().mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.PENDING,
      });

      storageService.saveFile = vi.fn().mockRejectedValue(new Error('Disk failure'));

      const file: UploadedFilePayload = {
        buffer: Buffer.from('%PDF-1.4 file data'),
        originalname: 'test.pdf',
        size: 100,
      };
      const user: UserContext = { id: 'user-1', roles: ['platform_admin'] };

      await expect(service.upload('space-1', file, {}, user)).rejects.toThrow('Disk failure');
      expect(documentsRepo.save).toHaveBeenCalled();
    });
  });

  describe('addVersion', () => {
    let queryRunnerMock: any;

    beforeEach(() => {
      queryRunnerMock = {
        connect: vi.fn().mockResolvedValue(undefined),
        startTransaction: vi.fn().mockResolvedValue(undefined),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
        manager: {
          findOne: vi.fn(),
          createQueryBuilder: vi.fn(),
          create: vi.fn((entity, dto) => ({ id: 'ver-2', ...dto })),
          save: vi.fn((entity) => Promise.resolve(entity)),
        },
      };
      dataSource.createQueryRunner = vi.fn().mockReturnValue(queryRunnerMock);
    });

    it('incrémente le versionNumber et met à jour currentVersionId sans jointure sur le verrou', async () => {
      const docMock = {
        id: 'doc-1',
        name: 'test.pdf',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.AVAILABLE,
        spaceId: 'space-1',
      };
      const spaceMock = { id: 'space-1', status: SpaceStatus.ACTIVE };

      queryRunnerMock.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Document) {
          return Promise.resolve(docMock);
        }
        if (entity === Space) {
          return Promise.resolve(spaceMock);
        }
        return Promise.resolve(null);
      });

      const verQb: any = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ max: 1 }),
      };

      queryRunnerMock.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === DocumentVersion) return verQb;
        return {};
      });

      const findOneDocQb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          ...docMock,
          currentVersion: { versionNumber: 2, sizeBytes: 200 },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(findOneDocQb);

      const file: UploadedFilePayload = {
        buffer: Buffer.from('%PDF-1.4 new version content'),
        originalname: 'test_v2.pdf',
        size: 200,
      };
      const user: UserContext = { id: 'u-1', roles: ['platform_admin'] };

      const result = await service.addVersion('doc-1', file, user);

      // Vérifie que la ligne documents est verrouillée sans jointure
      expect(queryRunnerMock.manager.findOne).toHaveBeenCalledWith(Document, {
        where: { id: 'doc-1' },
        lock: { mode: 'pessimistic_write', tables: ['documents'] },
      });
      // Vérifie que l'espace est chargé séparément
      expect(queryRunnerMock.manager.findOne).toHaveBeenCalledWith(Space, {
        where: { id: 'space-1' },
      });
      expect(result.version).toBe(2);
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(storageService.saveFile).toHaveBeenCalled();
    });

    it('renvoie 409 si le document est en statut error', async () => {
      const docMock = {
        id: 'doc-1',
        status: DocumentStatus.ERROR,
        spaceId: 'space-1',
      };
      const spaceMock = { id: 'space-1', status: SpaceStatus.ACTIVE };

      queryRunnerMock.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Document) return Promise.resolve(docMock);
        if (entity === Space) return Promise.resolve(spaceMock);
        return Promise.resolve(null);
      });

      const file: UploadedFilePayload = {
        buffer: Buffer.from('%PDF-1.4 new version content'),
        originalname: 'test_v2.pdf',
        size: 200,
      };

      await expect(service.addVersion('doc-1', file, { id: 'u-1' })).rejects.toThrow(ConflictException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    });

    it('renvoie 409 si l espace du document est inactif', async () => {
      const docMock = {
        id: 'doc-1',
        status: DocumentStatus.AVAILABLE,
        spaceId: 'space-1',
      };
      const spaceMock = { id: 'space-1', status: SpaceStatus.INACTIVE };

      queryRunnerMock.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Document) return Promise.resolve(docMock);
        if (entity === Space) return Promise.resolve(spaceMock);
        return Promise.resolve(null);
      });

      const file: UploadedFilePayload = {
        buffer: Buffer.from('%PDF-1.4 new version content'),
        originalname: 'test_v2.pdf',
        size: 200,
      };

      await expect(service.addVersion('doc-1', file, { id: 'u-1' })).rejects.toThrow(ConflictException);
    });

    it('renvoie 403 pour un compte staff hors filière', async () => {
      const docMock = {
        id: 'doc-1',
        status: DocumentStatus.AVAILABLE,
        spaceId: 'space-1',
      };
      const spaceMock = { id: 'space-1', status: SpaceStatus.ACTIVE, programId: 'prog-1' };

      queryRunnerMock.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Document) return Promise.resolve(docMock);
        if (entity === Space) return Promise.resolve(spaceMock);
        return Promise.resolve(null);
      });

      const assignQb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null), // Aucune affectation staff trouvée
      };
      assignmentsRepo.createQueryBuilder = vi.fn().mockReturnValue(assignQb);

      const file: UploadedFilePayload = {
        buffer: Buffer.from('%PDF-1.4 new version content'),
        originalname: 'test_v2.pdf',
        size: 200,
      };
      const staffUser: UserContext = { id: 'u-staff', roles: ['staff'] };

      await expect(service.addVersion('doc-1', file, staffUser)).rejects.toThrow(ForbiddenException);
    });

    it('renvoie 413 si la taille dépasse MAX_UPLOAD_MB', async () => {
      const file: UploadedFilePayload = {
        buffer: Buffer.alloc(25 * 1024 * 1024),
        originalname: 'test_v2.pdf',
        size: 25 * 1024 * 1024,
      };
      await expect(service.addVersion('doc-1', file, { id: 'u-1' })).rejects.toThrow(PayloadTooLargeException);
    });

    it('renvoie 400 pour un type interdit (magic bytes invalides)', async () => {
      const file: UploadedFilePayload = {
        buffer: Buffer.from('ceci n est pas un pdf ni une image'),
        originalname: 'test.txt',
        size: 100,
      };
      await expect(service.addVersion('doc-1', file, { id: 'u-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('download', () => {
    it('renvoie 409 si le document est en statut error', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 'doc-1', status: DocumentStatus.ERROR }),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      await expect(service.download('doc-1')).rejects.toThrow(ConflictException);
    });

    it('renvoie 404 si le document est introuvable', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      await expect(service.download('doc-unknown')).rejects.toThrow(NotFoundException);
    });

    it('assainit le nom d origine avant de le renvoyer et journalise l audit', async () => {
      const docMock = {
        id: 'doc-1',
        status: DocumentStatus.AVAILABLE,
        currentVersion: {
          id: 'v-1',
          storageKey: 'v-1.pdf',
          originalFilename: 'test\r\n"bad"/name.pdf',
          mimeType: 'application/pdf',
        },
      };
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(docMock),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      const result = await service.download('doc-1', undefined, { id: 'u-1' }, '127.0.0.1', 'Vitest');
      expect(result.sanitizedFilename).toBe('test___bad__name.pdf');
      expect(auditLogsRepo.save).toHaveBeenCalled();
    });

    it('si le fichier est absent sur disque : passe le statut à error et lève 500', async () => {
      const docMock = {
        id: 'doc-1',
        status: DocumentStatus.AVAILABLE,
        currentVersion: {
          id: 'v-1',
          storageKey: 'missing.pdf',
          originalFilename: 'missing.pdf',
          mimeType: 'application/pdf',
        },
      };
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(docMock),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      storageService.readFile = vi.fn().mockImplementation(() => {
        throw new NotFoundException('Fichier introuvable');
      });

      await expect(service.download('doc-1')).rejects.toThrow(InternalServerErrorException);
      expect(documentsRepo.update).toHaveBeenCalledWith('doc-1', {
        status: DocumentStatus.ERROR,
        errorMessage: 'Fichier introuvable sur le stockage',
      });
    });
  });

  describe('verify', () => {
    it('renvoie ok: true si le hash SHA-256 recalculé correspond', async () => {
      const buffer = Buffer.from('%PDF-1.4 valid content');
      const hash = createHash('sha256').update(buffer).digest('hex');

      const docMock = {
        id: 'doc-1',
        currentVersion: {
          storageKey: 'v1.pdf',
          checksumSha256: hash,
        },
      };
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(docMock),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);
      storageService.readFile = vi.fn().mockReturnValue(buffer);

      const res = await service.verify('doc-1');
      expect(res.ok).toBe(true);
    });

    it('renvoie ok: false et passe le statut à error si le hash est corrompu', async () => {
      const buffer = Buffer.from('%PDF-1.4 modified content');
      const docMock = {
        id: 'doc-1',
        currentVersion: {
          storageKey: 'v1.pdf',
          checksumSha256: 'different-checksum',
        },
      };
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(docMock),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);
      storageService.readFile = vi.fn().mockReturnValue(buffer);

      const res = await service.verify('doc-1');
      expect(res.ok).toBe(false);
      expect(documentsRepo.update).toHaveBeenCalledWith('doc-1', {
        status: DocumentStatus.ERROR,
        errorMessage: 'Somme de contrôle (checksum) invalide',
      });
    });
  });

  describe('findAll & getStats', () => {
    it('applique le tri document.createdAt DESC, la pagination skip/take et les filtres avec noms d entités', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [
            {
              id: 'doc-1',
              name: 'Cours_Graphes_Ch3.pdf',
              fileType: DocumentFileType.PDF,
              status: DocumentStatus.AVAILABLE,
              spaceId: 'space-1',
              space: {
                id: 'space-1',
                name: 'Graphes et algorithmes',
                program: {
                  id: 'prog-1',
                  name: 'ISI',
                  school: { id: 'sch-1', name: 'Institut Saint Jean' },
                },
              },
              uploadedBy: { id: 'u-1', firstName: 'Paul', lastName: 'Essiane' },
              currentVersion: { versionNumber: 1, sizeBytes: 2516582 },
              createdAt: new Date('2026-09-12T08:32:00.000Z'),
              updatedAt: new Date('2026-09-12T08:32:00.000Z'),
            },
          ],
          1,
        ]),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      const result = await service.findAll({
        page: 2,
        limit: 15,
        spaceId: 'space-1',
        programId: 'prog-1',
        schoolId: 'sch-1',
        status: DocumentStatus.AVAILABLE,
        fileType: DocumentFileType.PDF,
        search: 'graphes',
      });

      expect(qbMock.skip).toHaveBeenCalledWith(15);
      expect(qbMock.take).toHaveBeenCalledWith(15);
      expect(qbMock.orderBy).toHaveBeenCalledWith('document.createdAt', 'DESC');
      expect(qbMock.andWhere).toHaveBeenCalledWith('document.spaceId = :spaceId', {
        spaceId: 'space-1',
      });
      expect(result.data.length).toBe(1);
    });

    it('regroupe pending, ocr, segmentation, indexing dans processing', async () => {
      const qbMock: any = {
        leftJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { status: DocumentStatus.AVAILABLE, count: '10' },
          { status: DocumentStatus.PENDING, count: '2' },
          { status: DocumentStatus.OCR, count: '3' },
          { status: DocumentStatus.ERROR, count: '1' },
        ]),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      const stats = await service.getStats();
      expect(stats.total).toBe(16);
      expect(stats.available).toBe(10);
      expect(stats.processing).toBe(5);
      expect(stats.error).toBe(1);
    });
  });
});
