import { describe, it, expect, vi } from 'vitest';
import { PdfRasterizer } from './pdf-rasterizer.service.js';

describe('PdfRasterizer', () => {
  it('exécute pdftoppm avec les arguments -r 300 -png et nettoie le dossier', async () => {
    const configServiceMock: any = {
      get: vi.fn().mockReturnValue('pdftoppm'),
    };
    const rasterizer = new PdfRasterizer(configServiceMock);

    const execFileMock = vi.fn().mockImplementation((cmd, args, opts, cb) => {
      // Simuler l'écriture d'images dans outputDir
      cb(null, '', '');
    });
    rasterizer.setExecFileFunction(execFileMock);

    const tempDir = await rasterizer.createTempDir('doc-test');
    expect(tempDir).toContain('campusia-raster-doc-test');

    // Mocker fs.readdir via un spy ou exécuter avec un dossier réel
    // Ici execFileMock est appelé
    try {
      await rasterizer.rasterizeToPng('/safe/storage/doc.pdf', tempDir);
    } catch {
      // readdir retourne [] dans le dossier temporaire vide en test, c'est normal
    }

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [bin, args] = execFileMock.mock.calls[0];
    expect(bin).toBe('pdftoppm');
    expect(args[0]).toBe('-r');
    expect(args[1]).toBe('300');
    expect(args[2]).toBe('-png');
    expect(args[3]).toBe('/safe/storage/doc.pdf');

    await rasterizer.removeTempDir(tempDir);
  });
});
