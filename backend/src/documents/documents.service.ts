import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Document } from './document.entity.js';
import { DocumentVersion } from './document-version.entity.js';
import { Space } from '../spaces/space.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { StorageService } from './storage/storage.service.js';
import { DocumentFileType, DocumentStatus } from './document.enums.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { DocumentResponseDto } from './dto/document-response.dto.js';
import { DocumentStatsResponseDto } from './dto/document-stats-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { SpaceStatus } from '../spaces/space.enums.js';

export interface UserContext {
  id: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype?: string;
  fieldname?: string;
  encoding?: string;
}

interface DetectedFileType {
  mimeType: string;
  fileType: DocumentFileType;
  extension: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionsRepository: Repository<DocumentVersion>,
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    private readonly storageService: StorageService,
  ) {}

  detectFileType(buffer: Buffer, originalFilename: string): DetectedFileType {
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('Fichier vide ou trop court');
    }

    const ext = extname(originalFilename).toLowerCase();

    // PDF magic bytes: %PDF (25 50 44 46)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return {
        mimeType: 'application/pdf',
        fileType: DocumentFileType.PDF,
        extension: '.pdf',
      };
    }

    // JPEG magic bytes: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return {
        mimeType: 'image/jpeg',
        fileType: DocumentFileType.IMAGE,
        extension: ext === '.jpeg' ? '.jpeg' : '.jpg',
      };
    }

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return {
        mimeType: 'image/png',
        fileType: DocumentFileType.IMAGE,
        extension: '.png',
      };
    }

    // HEIC / HEIF / ftyp
    if (buffer.length >= 12) {
      const ftyp = buffer.subarray(4, 8).toString('ascii');
      const brand = buffer.subarray(8, 12).toString('ascii');
      if (
        ftyp === 'ftyp' &&
        ['heic', 'heix', 'hevc', 'heim', 'mif1', 'msf1'].includes(brand.toLowerCase())
      ) {
        return {
          mimeType: 'image/heic',
          fileType: DocumentFileType.IMAGE,
          extension: '.heic',
        };
      }
    }

    throw new BadRequestException(
      'Format de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, HEIC.',
    );
  }

  async upload(
    spaceId: string,
    file: UploadedFilePayload,
    dto: UploadDocumentDto,
    user: UserContext,
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('Le fichier est obligatoire');
    }

    const maxMb = this.storageService.getMaxUploadMb();
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        `La taille du fichier (${(file.size / (1024 * 1024)).toFixed(1)} Mo) dépasse la limite de ${maxMb} Mo`,
      );
    }

    // Vérifier l'existence et l'état de l'espace
    const space = await this.spacesRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.program', 'program')
      .leftJoinAndSelect('program.school', 'school')
      .where('space.id = :spaceId', { spaceId })
      .getOne();

    if (!space) {
      throw new NotFoundException('Espace introuvable');
    }

    if (space.status !== SpaceStatus.ACTIVE) {
      throw new ConflictException('Impossible d ajouter un document dans un espace inactif');
    }

    // Contrôle d'accès Staff (doit être affecté à la filière de l'espace)
    await this.checkStaffAccess(user, space);

    // Détection du type et validation magic numbers
    const detected = this.detectFileType(file.buffer, file.originalname);

    // Nom du document : fourni ou nom d'origine
    const documentName = dto.name && dto.name.trim() ? dto.name.trim() : file.originalname;

    // Calcul SHA256
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // Sauvegarde physique via StorageService
    const versionId = randomUUID();
    const storageKey = `${versionId}${detected.extension}`;
    await this.storageService.saveFile(storageKey, file.buffer);

    // Création transactionnelle ou séquentielle du Document et de sa DocumentVersion 1
    const newDoc = this.documentsRepository.create({
      spaceId: space.id,
      name: documentName,
      fileType: detected.fileType,
      status: DocumentStatus.PENDING,
      uploadedById: user.id,
    });
    const savedDoc = await this.documentsRepository.save(newDoc);

    const version = this.versionsRepository.create({
      id: versionId,
      documentId: savedDoc.id,
      versionNumber: 1,
      storageKey,
      originalFilename: file.originalname,
      mimeType: detected.mimeType,
      sizeBytes: file.size,
      checksumSha256: checksum,
      uploadedById: user.id,
    });
    const savedVersion = await this.versionsRepository.save(version);

    // Mise à jour de currentVersionId
    savedDoc.currentVersionId = savedVersion.id;
    await this.documentsRepository.update(savedDoc.id, {
      currentVersionId: savedVersion.id,
    });

    return this.findOne(savedDoc.id);
  }

  async checkStaffAccess(user: UserContext, space: Space): Promise<void> {
    const roles = user.roles || [];
    const isPlatformAdmin = roles.includes('platform_admin');
    const isSchoolAdmin = roles.includes('school_admin');
    const isStaff = roles.includes('staff');

    if (isPlatformAdmin || isSchoolAdmin) {
      return;
    }

    if (isStaff) {
      if (!space.programId) {
        throw new ForbiddenException('Le personnel ne peut ajouter des documents que dans les espaces de sa filière');
      }

      const activeAssignment = await this.assignmentsRepository
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.role', 'role')
        .where('assignment.userId = :userId', { userId: user.id })
        .andWhere('assignment.programId = :programId', { programId: space.programId })
        .andWhere('assignment.status = :status', { status: 'active' })
        .andWhere('role.code = :roleCode', { roleCode: 'staff' })
        .getOne();

      if (!activeAssignment) {
        throw new ForbiddenException(
          'Accès refusé : vous n êtes pas affecté à la filière de cet espace en tant que personnel',
        );
      }
    }
  }

  async findAll(query: QueryDocumentDto): Promise<PaginatedResponseDto<DocumentResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.space', 'space')
      .leftJoinAndSelect('space.program', 'program')
      .leftJoinAndSelect('program.school', 'school')
      .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('document.currentVersion', 'currentVersion')
      .orderBy('document.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.spaceId) {
      qb.andWhere('document.spaceId = :spaceId', { spaceId: query.spaceId });
    }

    if (query.programId) {
      qb.andWhere('space.programId = :programId', { programId: query.programId });
    }

    if (query.schoolId) {
      qb.andWhere('program.schoolId = :schoolId', { schoolId: query.schoolId });
    }

    if (query.status) {
      qb.andWhere('document.status = :status', { status: query.status });
    }

    if (query.fileType) {
      qb.andWhere('document.fileType = :fileType', { fileType: query.fileType });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere('LOWER(document.name) LIKE :search', {
        search: `%${query.search.trim().toLowerCase()}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((doc) => this.toResponseDto(doc)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async findOne(id: string): Promise<DocumentResponseDto> {
    const doc = await this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.space', 'space')
      .leftJoinAndSelect('space.program', 'program')
      .leftJoinAndSelect('program.school', 'school')
      .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('document.currentVersion', 'currentVersion')
      .where('document.id = :id', { id })
      .getOne();

    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    return this.toResponseDto(doc);
  }

  async getStats(schoolId?: string, programId?: string): Promise<DocumentStatsResponseDto> {
    const qb = this.documentsRepository
      .createQueryBuilder('document')
      .leftJoin('document.space', 'space')
      .leftJoin('space.program', 'program');

    if (programId) {
      qb.andWhere('space.programId = :programId', { programId });
    }

    if (schoolId) {
      qb.andWhere('program.schoolId = :schoolId', { schoolId });
    }

    const rawStats = await qb
      .select('document.status', 'status')
      .addSelect('COUNT(document.id)', 'count')
      .groupBy('document.status')
      .getRawMany<{ status: DocumentStatus; count: string }>();

    let total = 0;
    let available = 0;
    let processing = 0;
    let error = 0;

    for (const row of rawStats) {
      const c = parseInt(row.count, 10) || 0;
      total += c;

      if (row.status === DocumentStatus.AVAILABLE) {
        available += c;
      } else if (row.status === DocumentStatus.ERROR) {
        error += c;
      } else if (
        [
          DocumentStatus.PENDING,
          DocumentStatus.OCR,
          DocumentStatus.SEGMENTATION,
          DocumentStatus.INDEXING,
        ].includes(row.status)
      ) {
        processing += c;
      }
    }

    return {
      total,
      available,
      processing,
      error,
    };
  }

  private toResponseDto(doc: Document): DocumentResponseDto {
    const space = doc.space;
    const program = space?.program;
    const school = program?.school;
    const uploadedBy = doc.uploadedBy;

    const uName = uploadedBy
      ? `${uploadedBy.firstName || ''} ${uploadedBy.lastName || ''}`.trim() || uploadedBy.email
      : 'Inconnu';

    return {
      id: doc.id,
      name: doc.name,
      fileType: doc.fileType,
      status: doc.status,
      version: doc.currentVersion ? doc.currentVersion.versionNumber : 1,
      space: {
        id: space?.id || doc.spaceId,
        name: space?.name || '',
      },
      program: program
        ? {
            id: program.id,
            name: program.name,
          }
        : null,
      school: school
        ? {
            id: school.id,
            name: school.name,
          }
        : null,
      uploadedBy: {
        id: uploadedBy?.id || doc.uploadedById,
        name: uName,
      },
      sizeBytes: doc.currentVersion ? Number(doc.currentVersion.sizeBytes) : 0,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
