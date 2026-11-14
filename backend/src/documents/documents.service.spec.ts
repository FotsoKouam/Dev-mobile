import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { DocumentsService, UploadedFilePayload, UserContext } from './documents.service.js';
import { Document } from './document.entity.js';
import { DocumentVersion } from './document-version.entity.js';
import { Space } from '../spaces/space.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { StorageService } from './storage/storage.service.js';
import { DocumentFileType, DocumentStatus } from './document.enums.js';
import { SpaceStatus } from '../spaces/space.enums.js';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentsRepo: Partial<Record<keyof Repository<Document>, any>>;
  let versionsRepo: Partial<Record<keyof Repository<DocumentVersion>, any>>;
  let spacesRepo: Partial<Record<keyof Repository<Space>, any>>;
  let assignmentsRepo: Partial<Record<keyof Repository<Assignment>, any>>;
  let storageService: Partial<Record<keyof StorageService, any>>;

  beforeEach(() => {
    documentsRepo = {
      create: vi.fn((dto) => ({ id: 'doc-1', ...dto })),
      save: vi.fn((doc) => Promise.resolve({ id: 'doc-1', ...doc })),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: vi.fn(),
    };

    versionsRepo = {
      create: vi.fn((dto) => ({ id: 'ver-1', ...dto })),
      save: vi.fn((ver) => Promise.resolve({ id: 'ver-1', ...ver })),
    };

    spacesRepo = {
      createQueryBuilder: vi.fn(),
    };

    assignmentsRepo = {
      createQueryBuilder: vi.fn(),
    };

    storageService = {
      getMaxUploadMb: vi.fn().mockReturnValue(20),
      saveFile: vi.fn().mockResolvedValue('/storage/file.pdf'),
    };

    service = new DocumentsService(
      documentsRepo as any,
      versionsRepo as any,
      spacesRepo as any,
      assignmentsRepo as any,
      storageService as any,
    );
  });

  describe('findAll', () => {
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
              status: DocumentStatus.PENDING,
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
        status: DocumentStatus.PENDING,
        fileType: DocumentFileType.PDF,
        search: 'Graphes',
      });

      expect(documentsRepo.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(qbMock.orderBy).toHaveBeenCalledWith('document.createdAt', 'DESC');
      expect(qbMock.skip).toHaveBeenCalledWith(15);
      expect(qbMock.take).toHaveBeenCalledWith(15);
      expect(qbMock.andWhere).toHaveBeenCalledWith('document.spaceId = :spaceId', {
        spaceId: 'space-1',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('space.programId = :programId', {
        programId: 'prog-1',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('program.schoolId = :schoolId', {
        schoolId: 'sch-1',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('document.status = :status', {
        status: DocumentStatus.PENDING,
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('document.fileType = :fileType', {
        fileType: DocumentFileType.PDF,
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('LOWER(document.name) LIKE :search', {
        search: '%graphes%',
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Cours_Graphes_Ch3.pdf');
      expect(result.data[0].school?.name).toBe('Institut Saint Jean');
      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('renvoie le document avec space, program, school', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'doc-1',
          name: 'TD_Graphes.pdf',
          fileType: DocumentFileType.PDF,
          status: DocumentStatus.PENDING,
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
          currentVersion: { versionNumber: 1, sizeBytes: 1048576 },
          createdAt: new Date('2026-09-12T08:32:00.000Z'),
          updatedAt: new Date('2026-09-12T08:32:00.000Z'),
        }),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      const result = await service.findOne('doc-1');
      expect(result.id).toBe('doc-1');
      expect(result.space.name).toBe('Graphes et algorithmes');
      expect(result.program?.name).toBe('ISI');
      expect(result.school?.name).toBe('Institut Saint Jean');
      expect(result.uploadedBy.name).toBe('Paul Essiane');
    });

    it('lève NotFoundException si le document est absent', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(qbMock);

      await expect(service.findOne('doc-inconnu')).rejects.toThrow(NotFoundException);
    });
  });

  describe('upload', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.5 fake pdf content');
    const mockFile: UploadedFilePayload = {
      buffer: validPdfBuffer,
      originalname: 'Cours_Graphes_Ch3.pdf',
      fieldname: 'file',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
    };

    const adminUser: UserContext = {
      id: 'u-admin',
      roles: ['platform_admin'],
    };

    it('crée le document et sa version 1 avec statut pending', async () => {
      const spaceQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'space-1',
          name: 'Graphes et algorithmes',
          status: SpaceStatus.ACTIVE,
          programId: 'prog-1',
          program: {
            id: 'prog-1',
            name: 'ISI',
            school: { id: 'sch-1', name: 'Institut Saint Jean' },
          },
        }),
      };
      spacesRepo.createQueryBuilder = vi.fn().mockReturnValue(spaceQbMock);

      // findOne appelé à la fin
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: 'doc-1',
        name: 'Cours_Graphes_Ch3.pdf',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.PENDING,
        version: 1,
        space: { id: 'space-1', name: 'Graphes et algorithmes' },
        program: { id: 'prog-1', name: 'ISI' },
        school: { id: 'sch-1', name: 'Institut Saint Jean' },
        uploadedBy: { id: 'u-admin', name: 'Admin' },
        sizeBytes: validPdfBuffer.length,
        createdAt: '2026-09-12T08:32:00.000Z',
        updatedAt: '2026-09-12T08:32:00.000Z',
      });

      const res = await service.upload('space-1', mockFile, {}, adminUser);

      expect(storageService.saveFile).toHaveBeenCalled();
      expect(documentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-1',
          name: 'Cours_Graphes_Ch3.pdf',
          fileType: DocumentFileType.PDF,
          status: DocumentStatus.PENDING,
          uploadedById: 'u-admin',
        }),
      );
      expect(versionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 1,
          originalFilename: 'Cours_Graphes_Ch3.pdf',
          mimeType: 'application/pdf',
          uploadedById: 'u-admin',
        }),
      );
      expect(res.status).toBe(DocumentStatus.PENDING);
      expect(res.version).toBe(1);
    });

    it('refuse un type non autorisé (400)', async () => {
      const invalidFile = {
        ...mockFile,
        buffer: Buffer.from('Plain text file content'),
        originalname: 'test.txt',
      };

      const spaceQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'space-1',
          status: SpaceStatus.ACTIVE,
        }),
      };
      spacesRepo.createQueryBuilder = vi.fn().mockReturnValue(spaceQbMock);

      await expect(service.upload('space-1', invalidFile, {}, adminUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse une taille trop grande (413)', async () => {
      const hugeFile = {
        ...mockFile,
        size: 25 * 1024 * 1024,
      };

      await expect(service.upload('space-1', hugeFile, {}, adminUser)).rejects.toThrow(
        PayloadTooLargeException,
      );
    });

    it('refuse un espace inactif (409)', async () => {
      const spaceQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'space-1',
          status: SpaceStatus.INACTIVE,
        }),
      };
      spacesRepo.createQueryBuilder = vi.fn().mockReturnValue(spaceQbMock);

      await expect(service.upload('space-1', mockFile, {}, adminUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('refuse un staff hors de sa filière (403)', async () => {
      const spaceQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'space-1',
          status: SpaceStatus.ACTIVE,
          programId: 'prog-1',
        }),
      };
      spacesRepo.createQueryBuilder = vi.fn().mockReturnValue(spaceQbMock);

      const staffUser: UserContext = {
        id: 'u-staff',
        roles: ['staff'],
      };

      // Aucune affectation staff trouvée sur prog-1
      const assignQbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      assignmentsRepo.createQueryBuilder = vi.fn().mockReturnValue(assignQbMock);

      await expect(service.upload('space-1', mockFile, {}, staffUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getStats', () => {
    it('compte les 4 catégories correctement', async () => {
      const statsQbMock: any = {
        leftJoin: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { status: DocumentStatus.PENDING, count: '3' },
          { status: DocumentStatus.OCR, count: '2' },
          { status: DocumentStatus.AVAILABLE, count: '5' },
          { status: DocumentStatus.ERROR, count: '1' },
        ]),
      };
      documentsRepo.createQueryBuilder = vi.fn().mockReturnValue(statsQbMock);

      const stats = await service.getStats('sch-1', 'prog-1');

      expect(statsQbMock.andWhere).toHaveBeenCalledWith('space.programId = :programId', {
        programId: 'prog-1',
      });
      expect(statsQbMock.andWhere).toHaveBeenCalledWith('program.schoolId = :schoolId', {
        schoolId: 'sch-1',
      });

      expect(stats.total).toBe(11);
      expect(stats.available).toBe(5);
      expect(stats.processing).toBe(5); // 3 pending + 2 ocr
      expect(stats.error).toBe(1);
    });
  });
});
