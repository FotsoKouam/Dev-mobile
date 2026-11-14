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
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
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
}
