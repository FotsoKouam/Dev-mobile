import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { isAbsolute, normalize, resolve } from 'node:path';

@Injectable()
export class StorageService {
  private readonly storageRoot: string;
  private readonly maxUploadMb: number;

  constructor(private readonly configService: ConfigService) {
    const rawPath = this.configService.get<string>('STORAGE_PATH') || './storage';
    this.storageRoot = resolve(process.cwd(), rawPath);

    const rawMaxMb = this.configService.get<string | number>('MAX_UPLOAD_MB');
    this.maxUploadMb = rawMaxMb ? Number(rawMaxMb) : 20;

    this.ensureDirectoryExists(this.storageRoot);
  }

  getStorageRoot(): string {
    return this.storageRoot;
  }

  getMaxUploadMb(): number {
    return this.maxUploadMb;
  }

  ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  resolveSafePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('..') || isAbsolute(storageKey)) {
      throw new BadRequestException('Chemin de stockage non autorisé');
    }
    const safePath = normalize(resolve(this.storageRoot, storageKey));
    if (!safePath.startsWith(this.storageRoot)) {
      throw new BadRequestException('Tentative d accès hors du dossier de stockage');
    }
    return safePath;
  }

  async saveFile(storageKey: string, buffer: Buffer): Promise<string> {
    const maxBytes = this.maxUploadMb * 1024 * 1024;
    if (buffer.length > maxBytes) {
      throw new PayloadTooLargeException(
        `Le fichier dépasse la taille maximale autorisée de ${this.maxUploadMb} Mo`,
      );
    }

    const destinationPath = this.resolveSafePath(storageKey);
    this.ensureDirectoryExists(this.storageRoot);
    writeFileSync(destinationPath, buffer);
    return destinationPath;
  }

  getFilePath(storageKey: string): string {
    return this.resolveSafePath(storageKey);
  }

  readFile(storageKey: string): Buffer {
    const filePath = this.resolveSafePath(storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Fichier introuvable sur le stockage : ${storageKey}`);
    }
    return readFileSync(filePath);
  }

  deleteFile(storageKey: string): void {
    try {
      const filePath = this.resolveSafePath(storageKey);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Ignorer l'erreur si fichier déjà absent
    }
  }
}
