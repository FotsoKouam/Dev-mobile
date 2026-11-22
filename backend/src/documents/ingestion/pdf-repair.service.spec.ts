import { describe, it, expect, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PdfRepairService } from './pdf-repair.service.js';

describe('PdfRepairService', () => {
  it('exécute qpdf --repair et renvoie le chemin réparé si réussi', async () => {
    const configServiceMock: any = {
      get: vi.fn().mockReturnValue('qpdf'),
    };
    const repairService = new PdfRepairService(configServiceMock);

    const tempDir = await repairService.createTempDir('doc-repair');
    const outputPath = path.join(tempDir, 'repaired.pdf');

    const execFileMock = vi.fn().mockImplementation(async (cmd, args, opts, cb) => {
      // Simuler la création du fichier réparé
      await fs.writeFile(outputPath, 'repaired-pdf-bytes');
      cb(null, '', '');
    });
    repairService.setExecFileFunction(execFileMock);

    const result = await repairService.repairPdf('/storage/corrupt.pdf', tempDir);
    expect(execFileMock).toHaveBeenCalledWith(
      'qpdf',
      ['--repair', '/storage/corrupt.pdf', outputPath],
      { windowsHide: true },
      expect.any(Function),
    );
    expect(result).toBe(outputPath);

    await repairService.removeTempDir(tempDir);
  });

  it('retourne null si qpdf échoue', async () => {
    const configServiceMock: any = {
      get: vi.fn().mockReturnValue('qpdf'),
    };
    const repairService = new PdfRepairService(configServiceMock);
    const tempDir = await repairService.createTempDir('doc-repair-fail');

    const execFileMock = vi.fn().mockImplementation((cmd, args, opts, cb) => {
      const err: any = new Error('qpdf crash');
      err.code = 2;
      cb(err, '', 'error reading xref');
    });
    repairService.setExecFileFunction(execFileMock);

    const result = await repairService.repairPdf('/storage/corrupt.pdf', tempDir);
    expect(result).toBeNull();

    await repairService.removeTempDir(tempDir);
  });
});
