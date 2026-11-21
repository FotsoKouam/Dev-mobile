import { Injectable } from '@nestjs/common';

export interface ChunkItem {
  pageNumber: number;
  content: string;
}

@Injectable()
export class SegmentationService {
  /**
   * Découpe le texte de pages en morceaux (chunks) d'environ targetSize (800 car.),
   * avec un chevauchement d'environ overlap (100 car.), en respectant la structure
   * des paragraphes (\n\n ou \n) ou ponctuations fortes lorsque possible.
   *
   * @param pages Liste des pages avec leur numéro et texte
   * @param targetSize Taille cible maximale d'un chunk (~800 caractères)
   * @param overlap Taille du chevauchement (~100 caractères)
   */
  segment(
    pages: { pageNumber: number; text: string }[],
    targetSize = 800,
    overlap = 100,
  ): ChunkItem[] {
    const result: ChunkItem[] = [];

    for (const page of pages) {
      const pageText = page.text ? page.text.trim() : '';
      if (!pageText) {
        continue;
      }

      // Si le texte tient en entier dans un seul chunk
      if (pageText.length <= targetSize) {
        result.push({
          pageNumber: page.pageNumber,
          content: pageText,
        });
        continue;
      }

      let start = 0;
      while (start < pageText.length) {
        let end = start + targetSize;

        if (end >= pageText.length) {
          const chunkStr = pageText.slice(start).trim();
          if (chunkStr.length > 0) {
            result.push({
              pageNumber: page.pageNumber,
              content: chunkStr,
            });
          }
          break;
        }

        // Chercher une coupure propre (paragraphe, fin de phrase ou espace)
        // dans les 350 caractères précédant la limite `end`
        const searchZoneStart = Math.max(start + overlap, end - 350);
        const searchZone = pageText.slice(searchZoneStart, end);

        let cutPoint = -1;
        // Priorité 1 : coupure de paragraphe (\n\n)
        const dblNewline = searchZone.lastIndexOf('\n\n');
        if (dblNewline !== -1) {
          cutPoint = searchZoneStart + dblNewline;
        } else {
          // Priorité 2 : saut de ligne simple (\n)
          const singleNewline = searchZone.lastIndexOf('\n');
          if (singleNewline !== -1) {
            cutPoint = searchZoneStart + singleNewline;
          } else {
            // Priorité 3 : ponctuation de fin de phrase (. , ! ?)
            const punctMatch = /[.!?]\s+/g;
            let m: RegExpExecArray | null;
            let lastPunctIdx = -1;
            while ((m = punctMatch.exec(searchZone)) !== null) {
              lastPunctIdx = m.index + m[0].length;
            }
            if (lastPunctIdx !== -1) {
              cutPoint = searchZoneStart + lastPunctIdx;
            } else {
              // Priorité 4 : espace simple
              const lastSpace = searchZone.lastIndexOf(' ');
              if (lastSpace !== -1) {
                cutPoint = searchZoneStart + lastSpace + 1;
              }
            }
          }
        }

        if (cutPoint === -1) {
          cutPoint = end;
        }

        const chunkText = pageText.slice(start, cutPoint).trim();
        if (chunkText.length > 0) {
          result.push({
            pageNumber: page.pageNumber,
            content: chunkText,
          });
        }

        // Avancer en conservant le chevauchement (overlap)
        const nextStart = Math.max(start + 1, cutPoint - overlap);
        start = nextStart;
      }
    }

    return result;
  }
}
