import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let service: StorageService;
  let tempStorageDir: string;

  beforeEach(() => {
    tempStorageDir = mkdtempSync(join(tmpdir(), 'storage-test-'));
    const configMock = {
      get: (key: string) => {
        if (key === 'STORAGE_PATH') return tempStorageDir;
        if (key === 'MAX_UPLOAD_MB') return '5';
        return undefined;
      },
    } as unknown as ConfigService;

    service = new StorageService(configMock);
  });

  afterEach(() => {
    if (existsSync(tempStorageDir)) {
      rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  it('l écriture crée le dossier si absent', () => {
    const customDir = join(tempStorageDir, 'nested', 'folder');
    expect(existsSync(customDir)).toBe(false);
    service.ensureDirectoryExists(customDir);
    expect(existsSync(customDir)).toBe(true);
  });

  it('le nom de fichier stocké ne contient jamais le nom d origine', async () => {
    const originalName = 'Mon_Document_Confidentiel.pdf';
    const uuidStorageKey = '123e4567-e89b-12d3-a456-426614174000.pdf';
    const content = Buffer.from('%PDF-1.4 test content');

    const savedPath = await service.saveFile(uuidStorageKey, content);
    expect(savedPath).toContain(uuidStorageKey);
    expect(savedPath).not.toContain(originalName);
    expect(existsSync(savedPath)).toBe(true);
    expect(readFileSync(savedPath).toString()).toBe(content.toString());
  });

  it('la lecture ou écriture hors de STORAGE_PATH est refusée (protection contre les chemins relatifs)', async () => {
    const maliciousKey = '../../etc/passwd';
    expect(() => service.resolveSafePath(maliciousKey)).toThrow(BadRequestException);
    await expect(service.saveFile(maliciousKey, Buffer.from('bad'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuse un fichier dont la taille dépasse MAX_UPLOAD_MB', async () => {
    // 5 Mo limit + 1 byte
    const tooLargeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(
      service.saveFile('test.pdf', tooLargeBuffer),
    ).rejects.toThrow(PayloadTooLargeException);
  });
});
