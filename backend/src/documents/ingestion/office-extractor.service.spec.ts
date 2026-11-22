import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { OfficeExtractorService } from './office-extractor.service.js';

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

describe('OfficeExtractorService', () => {
  const service = new OfficeExtractorService();

  it('extrait le texte brut d un document DOCX via mammoth', async () => {
    (mammoth.extractRawText as any).mockResolvedValue({
      value: 'Contenu du cours de programmation.',
      messages: [],
    });

    const pages = await service.extractDocx(Buffer.from('fake-docx-buffer'));
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].text).toBe('Contenu du cours de programmation.');
  });

  it('extrait le texte d une présentation PPTX slide par slide', async () => {
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', '<p:sp><a:t>Titre Diapositive 1</a:t></p:sp>');
    zip.file('ppt/slides/slide2.xml', '<p:sp><a:t>Contenu Diapositive 2</a:t></p:sp>');
    const pptxBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const pages = await service.extractPptx(pptxBuffer);
    expect(pages).toHaveLength(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].text).toBe('Titre Diapositive 1');
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[1].text).toBe('Contenu Diapositive 2');
  });
});
