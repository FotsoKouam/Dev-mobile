import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
  Ip,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service.js';
import type { UploadedFilePayload } from './documents.service.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { DocumentResponseDto } from './dto/document-response.dto.js';
import { DocumentStatsResponseDto } from './dto/document-stats-response.dto.js';
import { DocumentVersionResponseDto } from './dto/document-version-response.dto.js';
import { DocumentVerifyResponseDto } from './dto/document-verify-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Lister les documents avec filtres et pagination' })
  @ApiOkResponse({ description: 'Liste paginée des documents' })
  async findAll(@Query() query: QueryDocumentDto): Promise<PaginatedResponseDto<DocumentResponseDto>> {
    return this.documentsService.findAll(query);
  }

  @Get('documents/stats')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Statistiques des documents (total, available, processing, error)' })
  @ApiOkResponse({ type: DocumentStatsResponseDto, description: 'Statistiques des documents' })
  async getStats(
    @Query('schoolId') schoolId?: string,
    @Query('programId') programId?: string,
  ): Promise<DocumentStatsResponseDto> {
    return this.documentsService.getStats(schoolId, programId);
  }

  @Get('documents/:id')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Obtenir le détail d un document' })
  @ApiOkResponse({ type: DocumentResponseDto, description: 'Détail du document' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.findOne(id);
  }

  @Post('spaces/:spaceId/documents')
  @RequirePermissions('add_document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un document dans un espace via upload de fichier' })
  @ApiResponse({ status: 201, type: DocumentResponseDto, description: 'Document créé avec succès' })
  @ApiBadRequestResponse({ description: 'Fichier manquant ou format non supporté' })
  @ApiForbiddenResponse({ description: 'Permissions insuffisantes ou personnel hors filière' })
  @ApiNotFoundResponse({ description: 'Espace introuvable' })
  @ApiConflictResponse({ description: 'Espace inactif' })
  @ApiPayloadTooLargeResponse({ description: 'Taille du fichier supérieure à la limite' })
  async upload(
    @Param('spaceId', new ParseUUIDPipe()) spaceId: string,
    @UploadedFile() file: UploadedFilePayload,
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ): Promise<DocumentResponseDto> {
    const user = req.user;
    return this.documentsService.upload(spaceId, file, dto, user);
  }

  @Post('documents/:id/versions')
  @RequirePermissions('add_document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter une nouvelle version à un document' })
  @ApiResponse({ status: 201, type: DocumentResponseDto, description: 'Nouvelle version ajoutée' })
  @ApiBadRequestResponse({ description: 'Fichier manquant ou format non supporté' })
  @ApiForbiddenResponse({ description: 'Personnel hors filière ou permissions insuffisantes' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  @ApiConflictResponse({ description: 'Document en erreur ou espace inactif' })
  @ApiPayloadTooLargeResponse({ description: 'Fichier trop volumineux' })
  async addVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: UploadedFilePayload,
    @Req() req: any,
  ): Promise<DocumentResponseDto> {
    const user = req.user;
    return this.documentsService.addVersion(id, file, user);
  }

  @Get('documents/:id/versions')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Historique des versions d un document' })
  @ApiOkResponse({ description: 'Liste des versions du document' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  async getVersions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResponseDto<DocumentVersionResponseDto>> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.documentsService.getVersions(id, p, l);
  }

  @Get('documents/:id/download')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Télécharger la version courante d un document' })
  @ApiOkResponse({ description: 'Flux du fichier' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  @ApiConflictResponse({ description: 'Document en erreur' })
  @ApiInternalServerErrorResponse({ description: 'Fichier absent du stockage' })
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: any,
    @Res() res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<void> {
    const user = req.user;
    const result = await this.documentsService.download(id, undefined, user, ipAddress, userAgent);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.sanitizedFilename}"`,
    );
    res.send(result.streamOrBuffer);
  }

  @Get('documents/:id/versions/:versionId/download')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Télécharger une version spécifique d un document' })
  @ApiOkResponse({ description: 'Flux du fichier' })
  @ApiNotFoundResponse({ description: 'Document ou version introuvable' })
  @ApiConflictResponse({ description: 'Document en erreur' })
  @ApiInternalServerErrorResponse({ description: 'Fichier absent du stockage' })
  async downloadVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Req() req: any,
    @Res() res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<void> {
    const user = req.user;
    const result = await this.documentsService.download(id, versionId, user, ipAddress, userAgent);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.sanitizedFilename}"`,
    );
    res.send(result.streamOrBuffer);
  }

  @Post('documents/:id/verify')
  @RequirePermissions('access_all_schools')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier la somme de contrôle SHA-256 de la version courante (platform_admin)' })
  @ApiOkResponse({ type: DocumentVerifyResponseDto })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  async verify(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DocumentVerifyResponseDto> {
    return this.documentsService.verify(id);
  }
}
