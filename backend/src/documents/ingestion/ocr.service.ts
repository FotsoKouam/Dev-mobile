import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';

export type ExecFileFunction = typeof execFile;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private execFileFn: ExecFileFunction = execFile;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Permet d'injecter une fonction execFile personnalisée (notamment pour les tests unitaires sous ESM)
   */
  setExecFileFunction(fn: ExecFileFunction): void {
    this.execFileFn = fn;
  }

  /**
   * Extrait le texte d'un fichier image ou document scanné via Tesseract OCR en ligne de commande.
   * Utilise execFile sans shell pour éviter toute injection.
   * Le chemin de l'exécutable et la langue sont configurables via variables d'environnement.
   *
   * @param absoluteFilePath Chemin absolu du fichier sur le disque (généré de manière sécurisée par StorageService)
   * @returns Texte extrait
   */
  async extractText(absoluteFilePath: string): Promise<string> {
    const tesseractPath =
      this.configService.get<string>('TESSERACT_PATH') || 'tesseract';
    const lang = this.configService.get<string>('TESSERACT_LANG') || 'fra';

    // Commande : tesseract <input_file> stdout -l fra
    const args = [absoluteFilePath, 'stdout', '-l', lang];

    this.logger.debug(
      `Exécution OCR via execFile: ${tesseractPath} ${args.join(' ')}`,
    );

    return new Promise<string>((resolve, reject) => {
      this.execFileFn(
        tesseractPath,
        args,
        {
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        },
        (err, stdout) => {
          if (err) {
            this.logger.error(`Échec de l exécution OCR Tesseract: ${err.message}`);
            return reject(
              new Error(
                `Erreur lors du traitement OCR du document: ${err.message || 'Erreur inconnue'}`,
              ),
            );
          }
          resolve(stdout ? stdout.trim() : '');
        },
      );
    });
  }
}
