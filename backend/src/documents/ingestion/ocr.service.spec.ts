import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { OcrService } from './ocr.service.js';

describe('OcrService', () => {
  let service: OcrService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'TESSERACT_PATH') return '/usr/bin/tesseract';
        if (key === 'TESSERACT_LANG') return 'fra';
        return undefined;
      }),
    } as any;

    service = new OcrService(configService);
  });

  it('construit la commande avec execFile, langue fra et sans shell', async () => {
    const execFileMock = vi.fn((file: any, args: any, options: any, callback: any) => {
      const cb = typeof options === 'function' ? options : callback;
      cb(null, 'Texte extrait par OCR en français');
      return {} as any;
    });

    service.setExecFileFunction(execFileMock as any);

    const result = await service.extractText('/path/to/storage/doc.png');

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [calledPath, calledArgs, calledOptions] = execFileMock.mock.calls[0];

    // Vérifie le binaire et les arguments
    expect(calledPath).toBe('/usr/bin/tesseract');
    expect(calledArgs).toEqual(['/path/to/storage/doc.png', 'stdout', '-l', 'fra']);

    // Vérifie qu'aucun shell n'est activé
    expect(calledOptions?.shell).toBeFalsy();

    expect(result).toBe('Texte extrait par OCR en français');
  });

  it('lève une erreur si execFile échoue', async () => {
    const execFileMock = vi.fn((file: any, args: any, options: any, callback: any) => {
      const cb = typeof options === 'function' ? options : callback;
      cb(new Error('Tesseract introuvable'), '');
      return {} as any;
    });

    service.setExecFileFunction(execFileMock as any);

    await expect(service.extractText('/path/to/storage/doc.png')).rejects.toThrow(
      /Erreur lors du traitement OCR/i,
    );
  });
});
