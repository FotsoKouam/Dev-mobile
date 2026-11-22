import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export type ExecFileFunction = typeof execFile;

@Injectable()
export class PdfRasterizer {
  private readonly logger = new Logger(PdfRasterizer.name);
  private execFileFn: ExecFileFunction = execFile;

  constructor(private readonly configService: ConfigService) {}

  setExecFileFunction(fn: ExecFileFunction): void {
    this.execFileFn = fn;
  }

  /**
   * Convertit un fichier PDF en une série d'images PNG (une par page) à 300 DPI via pdftoppm.
   * Utilise un dossier temporaire isolé par document qui doit être nettoyé par l'appelant.
   *
   * @param pdfPath Chemin absolu sécurisé du PDF
   * @param outputDir Dossier temporaire de sortie
   * @returns Liste triée des chemins absolus des images PNG générées
   */
  async rasterizeToPng(pdfPath: string, outputDir: string): Promise<string[]> {
    const pdftoppmPath =
      this.configService.get<string>('PDFTOPPM_PATH') || 'pdftoppm';

    const outputPrefix = path.join(outputDir, 'page');
    // pdftoppm -r 300 -png <pdfPath> <outputPrefix>
    const args = ['-r', '300', '-png', pdfPath, outputPrefix];

    this.logger.debug(
      `Exécution pdftoppm via execFile: ${pdftoppmPath} ${args.join(' ')}`,
    );

    await new Promise<void>((resolve, reject) => {
      this.execFileFn(
        pdftoppmPath,
        args,
        { windowsHide: true },
        (err, _stdout, stderr) => {
          if (err) {
            this.logger.error(`Échec pdftoppm: ${err.message}. stderr: ${stderr}`);
            return reject(new Error(`Échec de la conversion du PDF en images: ${err.message}`));
          }
          resolve();
        },
      );
    });

    const files = await fs.readdir(outputDir);
    // pdftoppm génère page-1.png, page-01.png, page-001.png etc.
    const pngFiles = files
      .filter((f) => f.startsWith('page') && f.endsWith('.png'))
      .sort((a, b) => {
        // Extraire le numéro de page
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      })
      .map((f) => path.join(outputDir, f));

    return pngFiles;
  }

  /**
   * Crée un dossier temporaire unique pour un document dans os.tmpdir().
   */
  async createTempDir(docId: string): Promise<string> {
    const dir = path.join(os.tmpdir(), `campusia-raster-${docId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Supprime récursivement un dossier temporaire.
   */
  async removeTempDir(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (err: any) {
      this.logger.warn(`Impossible de nettoyer le dossier temporaire ${dir}: ${err?.message}`);
    }
  }
}
