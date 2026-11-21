import { describe, it, expect } from 'vitest';
import { SegmentationService } from './segmentation.service.js';

describe('SegmentationService', () => {
  const service = new SegmentationService();

  it('ne produit pas de chunk vide et gère les pages avec peu de texte', () => {
    const pages = [
      { pageNumber: 1, text: '   ' },
      { pageNumber: 2, text: 'Court texte sur la page 2.' },
    ];

    const chunks = service.segment(pages);
    expect(chunks.length).toBe(1);
    expect(chunks[0].pageNumber).toBe(2);
    expect(chunks[0].content).toBe('Court texte sur la page 2.');
  });

  it('découpe un long texte en respectant la taille maximale (~800 car.) et le chevauchement (~100 car.)', () => {
    // Génère un texte de 2500 caractères avec des paragraphes
    const paragraph = 'CampusIA est une plateforme pour l enseignement supérieur. '.repeat(10) + '\n\n';
    const longText = paragraph.repeat(5); // ~3000 caractères

    const chunks = service.segment([{ pageNumber: 1, text: longText }], 800, 100);

    expect(chunks.length).toBeGreaterThan(1);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Aucun chunk ne doit être vide
      expect(chunk.content.trim().length).toBeGreaterThan(0);
      // Aucun chunk ne doit dépasser la taille maximale autorisée (800 car. + marge de découpe)
      expect(chunk.content.length).toBeLessThanOrEqual(850);
      expect(chunk.pageNumber).toBe(1);

      // Vérifie le chevauchement avec le chunk suivant
      if (i < chunks.length - 1) {
        const currentEnd = chunk.content.slice(-50);
        const nextStart = chunks[i + 1].content.slice(0, 150);
        // Des mots de la fin du chunk courant doivent se retrouver au début du suivant
        const words = currentEnd.split(/\s+/).filter((w) => w.length > 5);
        if (words.length > 0) {
          const hasOverlap = words.some((w) => nextStart.includes(w));
          expect(hasOverlap).toBe(true);
        }
      }
    }
  });

  it('respecte les paragraphes quand c est possible', () => {
    const p1 = 'A'.repeat(500);
    const p2 = 'B'.repeat(500);
    const full = `${p1}\n\n${p2}`;

    const chunks = service.segment([{ pageNumber: 1, text: full }], 800, 100);
    expect(chunks.length).toBe(2);
    expect(chunks[0].content).toBe(p1);
    expect(chunks[1].content).toContain(p2);
  });
});
