import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import JSZip from 'jszip';

export interface PageExtracted {
  pageNumber: number;
  text: string;
}

@Injectable()
export class OfficeExtractorService {
  private readonly logger = new Logger(OfficeExtractorService.name);

  /**
   * Extrait le texte d'un document Word (.docx) à l'aide de mammoth.
   * Retourne un document d'une seule page ou plusieurs selon le contenu.
   */
  async extractDocx(buffer: Buffer): Promise<PageExtracted[]> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value ? result.value.trim() : '';
      return [{ pageNumber: 1, text }];
    } catch (err: any) {
      this.logger.error(`Échec extraction docx: ${err?.message}`);
      throw new Error(`Échec de l extraction du document DOCX: ${err?.message}`);
    }
  }

  /**
   * Extrait le texte d'une présentation PowerPoint (.pptx) diapositive par diapositive
   * en lisant les fichiers ppt/slides/slide*.xml dans l'archive ZIP.
   */
  async extractPptx(buffer: Buffer): Promise<PageExtracted[]> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles: { name: string; index: number; file: JSZip.JSZipObject }[] = [];

      // Trouver tous les ppt/slides/slide<N>.xml
      zip.forEach((relativePath, file) => {
        const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (match) {
          slideFiles.push({
            name: relativePath,
            index: parseInt(match[1], 10),
            file,
          });
        }
      });

      // Trier par numéro de diapositive
      slideFiles.sort((a, b) => a.index - b.index);

      if (slideFiles.length === 0) {
        return [{ pageNumber: 1, text: '' }];
      }

      const pages: PageExtracted[] = [];

      for (const item of slideFiles) {
        const xmlContent = await item.file.async('text');
        // Extraire tout le texte contenu dans les balises XML <a:t>...</a:t>
        const textMatches = xmlContent.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
        const slideText = textMatches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.push({
          pageNumber: item.index,
          text: slideText,
        });
      }

      return pages;
    } catch (err: any) {
      this.logger.error(`Échec extraction pptx: ${err?.message}`);
      throw new Error(`Échec de l extraction de la présentation PPTX: ${err?.message}`);
    }
  }
}
