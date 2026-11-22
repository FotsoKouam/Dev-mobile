import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export type ExecFileFunction = typeof execFile;

@Injectable()
export class PdfRepairService {
  private readonly logger = new Logger(PdfRepairService.name);
  private execFileFn: ExecFileFunction = execFile;

  constructor(private readonly configService: ConfigService) {}

  setExecFileFunction(fn: ExecFileFunction): void {
    this.execFileFn = fn;
  }

  /**
   * Tente de réparer un PDF corrompu via qpdf --repair.
   * Le fichier original n'est jamais modifié. Le fichier réparé est écrit dans un sous-dossier temporaire.
   *
   * @param inputPath Chemin absolu du fichier original
   * @param tempDir Dossier temporaire où écrire le fichier réparé
   * @returns Chemin absolu du fichier réparé ou null en cas d'échec
   */
  async repairPdf(inputPath: string, tempDir: string): Promise<string | null> {
    const qpdfPath = this.configService.get<string>('QPDF_PATH') || 'qpdf';
    const outputPath = path.join(tempDir, 'repaired.pdf');

    // qpdf --repair <inputPath> <outputPath>
    const args = ['--repair', inputPath, outputPath];

    this.logger.debug(
      `Tentative de réparation PDF via qpdf: ${qpdfPath} ${args.join(' ')}`,
    );

    return new Promise<string | null>((resolve) => {
      this.execFileFn(
        qpdfPath,
        args,
        { windowsHide: true },
        async (err, _stdout, stderr) => {
          // qpdf retourne 0 en cas de succès, 3 si des avertissements ont été réparés (fichier valide produit)
          if (err && (err as any).code !== 0 && (err as any).code !== 3) {
            this.logger.warn(`Échec qpdf --repair: ${err.message}. stderr: ${stderr}`);
            return resolve(null);
          }

          try {
            await fs.access(outputPath);
            resolve(outputPath);
          } catch {
            resolve(null);
          }
        },
      );
    });
  }

  /**
   * Crée un dossier temporaire unique pour la réparation.
   */
  async createTempDir(docId: string): Promise<string> {
    const dir = path.join(os.tmpdir(), `campusia-repair-${docId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
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
