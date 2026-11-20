import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Document } from './document.entity.js';
import { DocumentVersion } from './document-version.entity.js';
import { Space } from '../spaces/space.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { AuditLog } from '../audit/audit-log.entity.js';
import { StorageService } from './storage/storage.service.js';
import { DocumentFileType, DocumentStatus } from './document.enums.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { DocumentResponseDto } from './dto/document-response.dto.js';
import { DocumentStatsResponseDto } from './dto/document-stats-response.dto.js';
import { DocumentVersionResponseDto } from './dto/document-version-response.dto.js';
import { DocumentVerifyResponseDto } from './dto/document-verify-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { SpaceStatus } from '../spaces/space.enums.js';
import { AuditActionQuery } from '../audit/audit.enums.js';

export interface UserContext {
  id: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  isPlatformAdmin?: boolean;
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

export interface DownloadFileResult {
  streamOrBuffer: Buffer;
  mimeType: string;
  sanitizedFilename: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionsRepository: Repository<DocumentVersion>,
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource,
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

    // HEIC magic bytes: ftyp box at offset 4 with 'heic' or 'mif1'
    if (buffer.length >= 12) {
      const ftyp = buffer.subarray(4, 8).toString('ascii');
      const brand = buffer.subarray(8, 12).toString('ascii');
      if (
        ftyp === 'ftyp' &&
        (brand === 'heic' ||
          brand === 'heix' ||
          brand === 'hevc' ||
          brand === 'mif1')
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

  async setStatus(
    documentId: string,
    newStatus: DocumentStatus,
    errorMessage?: string | null,
  ): Promise<Document> {
    const doc = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    const currentStatus = doc.status;

    // Transitions autorisées uniquement :
    // pending -> available ou error
    // available -> error
    // error -> pending
    const isAllowed =
      (currentStatus === DocumentStatus.PENDING &&
        (newStatus === DocumentStatus.AVAILABLE || newStatus === DocumentStatus.ERROR)) ||
      (currentStatus === DocumentStatus.AVAILABLE && newStatus === DocumentStatus.ERROR) ||
      (currentStatus === DocumentStatus.ERROR && newStatus === DocumentStatus.PENDING);

    if (!isAllowed) {
      throw new BadRequestException(
        `Transition de statut non autorisée : impossible de passer de '${currentStatus}' à '${newStatus}'`,
      );
    }

    doc.status = newStatus;
    doc.errorMessage = newStatus === DocumentStatus.ERROR ? (errorMessage || null) : null;
    return this.documentsRepository.save(doc);
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

    // Sauvegarde physique et création de la version
    const versionId = randomUUID();
    const storageKey = `${versionId}${detected.extension}`;

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

    try {
      await this.storageService.saveFile(storageKey, file.buffer);
      // Le document passe automatiquement à AVAILABLE
      await this.setStatus(savedDoc.id, DocumentStatus.AVAILABLE);
    } catch (err: any) {
      this.logger.error(`Erreur d écriture stockage pour le document ${savedDoc.id}: ${err?.message}`);
      await this.setStatus(savedDoc.id, DocumentStatus.ERROR, 'Erreur lors de l écriture sur disque');
      throw err;
    }

    return this.findOne(savedDoc.id);
  }

  async addVersion(
    documentId: string,
    file: UploadedFilePayload,
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

    // Détection du type
    const detected = this.detectFileType(file.buffer, file.originalname);

    // Exécution dans une transaction avec verrou pessimiste
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let storageKeyToSave: string;

    try {
      const doc = await queryRunner.manager
        .createQueryBuilder(Document, 'document')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('document.space', 'space')
        .where('document.id = :id', { id: documentId })
        .getOne();

      if (!doc) {
        throw new NotFoundException('Document introuvable');
      }

      if (doc.status === DocumentStatus.ERROR) {
        throw new ConflictException('Impossible d ajouter une version sur un document en erreur');
      }

      const space = doc.space;
      if (!space || space.status !== SpaceStatus.ACTIVE) {
        throw new ConflictException('Impossible d ajouter une version dans un espace inactif');
      }

      // Contrôle de filière pour staff
      await this.checkStaffAccess(user, space);

      // Calcul max versionNumber
      const maxVersionRow = await queryRunner.manager
        .createQueryBuilder(DocumentVersion, 'version')
        .select('MAX(version.versionNumber)', 'max')
        .where('version.documentId = :documentId', { documentId: doc.id })
        .getRawOne<{ max: number | string | null }>();

      const currentMax = maxVersionRow?.max ? Number(maxVersionRow.max) : 0;
      const nextVersionNumber = currentMax + 1;

      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      const versionId = randomUUID();
      const storageKey = `${versionId}${detected.extension}`;

      storageKeyToSave = storageKey;

      const newVersion = queryRunner.manager.create(DocumentVersion, {
        id: versionId,
        documentId: doc.id,
        versionNumber: nextVersionNumber,
        storageKey,
        originalFilename: file.originalname,
        mimeType: detected.mimeType,
        sizeBytes: file.size,
        checksumSha256: checksum,
        uploadedById: user.id,
      });

      await queryRunner.manager.save(newVersion);

      // Mise à jour de document
      doc.currentVersionId = versionId;
      doc.fileType = detected.fileType;
      doc.status = DocumentStatus.AVAILABLE;
      doc.errorMessage = null;

      await queryRunner.manager.save(doc);

      // Commit de la transaction BD
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof NotFoundException || err instanceof ConflictException || err instanceof ForbiddenException || err instanceof BadRequestException || err instanceof PayloadTooLargeException) {
        throw err;
      }
      // Violation d'unicité éventuelle
      if ((err as any)?.code === '23505') {
        throw new ConflictException('Une version avec ce numéro existe déjà');
      }
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Sauvegarde physique après commit
    try {
      await this.storageService.saveFile(storageKeyToSave, file.buffer);
    } catch (writeErr: any) {
      this.logger.error(`Échec écriture nouvelle version sur disque: ${writeErr?.message}`);
      await this.documentsRepository.update(documentId, {
        status: DocumentStatus.ERROR,
        errorMessage: 'Erreur lors de l écriture de la nouvelle version sur disque',
      });
      throw writeErr;
    }

    return this.findOne(documentId);
  }

  async getVersions(
    documentId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponseDto<DocumentVersionResponseDto>> {
    const docExists = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!docExists) {
      throw new NotFoundException('Document introuvable');
    }

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const [versions, total] = await this.versionsRepository
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.uploadedBy', 'uploadedBy')
      .where('version.documentId = :documentId', { documentId })
      .orderBy('version.versionNumber', 'DESC')
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    const data: DocumentVersionResponseDto[] = versions.map((v) => {
      const uName = v.uploadedBy
        ? `${v.uploadedBy.firstName || ''} ${v.uploadedBy.lastName || ''}`.trim() || v.uploadedBy.email
        : 'Inconnu';

      return {
        versionNumber: v.versionNumber,
        originalFilename: v.originalFilename,
        sizeBytes: Number(v.sizeBytes),
        mimeType: v.mimeType,
        uploadedBy: {
          id: v.uploadedById,
          name: uName,
        },
        createdAt: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
      },
    };
  }

  async download(
    documentId: string,
    versionIdOptional?: string,
    user?: UserContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DownloadFileResult> {
    const doc = await this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.space', 'space')
      .leftJoinAndSelect('document.currentVersion', 'currentVersion')
      .where('document.id = :id', { id: documentId })
      .getOne();

    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    if (doc.status === DocumentStatus.ERROR) {
      throw new ConflictException('Téléchargement impossible : le document est en statut erreur');
    }

    // Contrôle staff par filière
    if (user && doc.space) {
      await this.checkStaffAccess(user, doc.space);
    }

    // Déterminer la version à télécharger
    let version: DocumentVersion | null = null;
    if (versionIdOptional) {
      version = await this.versionsRepository.findOne({
        where: { id: versionIdOptional, documentId: doc.id },
      });
      if (!version) {
        throw new NotFoundException('Version de document introuvable');
      }
    } else {
      version = doc.currentVersion || (doc.currentVersionId
        ? await this.versionsRepository.findOne({ where: { id: doc.currentVersionId } })
        : null);
    }

    if (!version) {
      throw new NotFoundException('Aucune version disponible pour ce document');
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = this.storageService.readFile(version.storageKey);
    } catch (err: any) {
      this.logger.error(`Fichier absent sur le stockage pour le document ${doc.id}: ${err?.message}`);
      await this.documentsRepository.update(doc.id, {
        status: DocumentStatus.ERROR,
        errorMessage: 'Fichier introuvable sur le stockage',
      });
      throw new InternalServerErrorException('Fichier introuvable sur le stockage');
    }

    // Assainissement du nom de fichier pour le header Content-Disposition
    // Pas de guillemets, retours à la ligne, barres obliques
    const sanitizedFilename = (version.originalFilename || 'document')
      .replace(/[\r\n"\\/]/g, '_')
      .trim();

    // Journalisation dans audit_logs
    try {
      const auditEntry = this.auditLogsRepository.create({
        actorUserId: user?.id || null,
        action: AuditActionQuery.DOCUMENT_DOWNLOAD,
        target: `document:${doc.id}`,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });
      await this.auditLogsRepository.save(auditEntry);
    } catch (auditErr: any) {
      this.logger.warn(`Échec journalisation audit pour téléchargement document ${doc.id}: ${auditErr?.message}`);
    }

    return {
      streamOrBuffer: fileBuffer,
      mimeType: version.mimeType,
      sanitizedFilename,
    };
  }

  async verify(documentId: string): Promise<DocumentVerifyResponseDto> {
    const doc = await this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.currentVersion', 'currentVersion')
      .where('document.id = :id', { id: documentId })
      .getOne();

    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    const version = doc.currentVersion || (doc.currentVersionId
      ? await this.versionsRepository.findOne({ where: { id: doc.currentVersionId } })
      : null);

    if (!version) {
      throw new NotFoundException('Aucune version associée à ce document');
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = this.storageService.readFile(version.storageKey);
    } catch {
      await this.documentsRepository.update(doc.id, {
        status: DocumentStatus.ERROR,
        errorMessage: 'Fichier introuvable sur le stockage',
      });
      return { ok: false };
    }

    const actualHash = createHash('sha256').update(fileBuffer).digest('hex');
    const isValid = actualHash === version.checksumSha256;

    if (!isValid) {
      await this.documentsRepository.update(doc.id, {
        status: DocumentStatus.ERROR,
        errorMessage: 'Somme de contrôle (checksum) invalide',
      });
      return { ok: false };
    }

    return { ok: true };
  }

  async checkStaffAccess(user: UserContext, space: Space): Promise<void> {
    const roles = user.roles || [];
    const isPlatformAdmin = Boolean(user.isPlatformAdmin) || roles.includes('platform_admin');
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
      errorMessage: doc.status === DocumentStatus.ERROR ? (doc.errorMessage || null) : null,
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
