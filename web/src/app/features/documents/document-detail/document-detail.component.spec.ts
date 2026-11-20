import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentDetailComponent } from './document-detail.component';
import { DocumentsApiService } from '../../../core/api/documents-api.service';
import { SessionService } from '../../../core/session.service';
import { DocumentItem } from '../../../core/api/models/document.model';

describe('DocumentDetailComponent', () => {
  let component: DocumentDetailComponent;
  let fixture: ComponentFixture<DocumentDetailComponent>;
  let documentsApiSpy: {
    getDocument: ReturnType<typeof vi.fn>;
    getDocumentVersions: ReturnType<typeof vi.fn>;
    downloadDocument: ReturnType<typeof vi.fn>;
    downloadDocumentVersion: ReturnType<typeof vi.fn>;
  };
  let sessionServiceSpy: {
    hasPermission: ReturnType<typeof vi.fn>;
  };

  const mockDoc: DocumentItem = {
    id: 'doc-1',
    name: 'Cours_Graphes_Ch3.pdf',
    fileType: 'pdf',
    status: 'pending',
    version: 1,
    space: { id: 'sp-1', name: 'Graphes et algorithmes' },
    program: { id: 'prog-1', name: 'ISI' },
    school: { id: 'sch-1', name: 'Institut Saint Jean' },
    uploadedBy: { id: 'u-1', name: 'Essiane Paul' },
    sizeBytes: 2516582,
    createdAt: '2026-09-12T08:32:00.000Z',
    updatedAt: '2026-09-12T08:32:00.000Z',
  };

  const mockAvailableDoc: DocumentItem = {
    ...mockDoc,
    status: 'available',
  };

  beforeEach(async () => {
    documentsApiSpy = {
      getDocument: vi.fn().mockReturnValue(of(mockDoc)),
      getDocumentVersions: vi.fn().mockReturnValue(
        of({
          data: [
            {
              versionNumber: 1,
              originalFilename: 'Cours_Graphes_Ch3.pdf',
              sizeBytes: 2516582,
              mimeType: 'application/pdf',
              uploadedBy: { id: 'u-1', name: 'Essiane Paul' },
              createdAt: '2026-09-12T08:32:00.000Z',
            },
          ],
          meta: { page: 1, limit: 10, total: 1 },
        }),
      ),
      downloadDocument: vi.fn().mockReturnValue(of(new Blob(['pdf content'], { type: 'application/pdf' }))),
      downloadDocumentVersion: vi.fn().mockReturnValue(of(new Blob(['v1 content'], { type: 'application/pdf' }))),
    };

    sessionServiceSpy = {
      hasPermission: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentDetailComponent],
      providers: [
        { provide: DocumentsApiService, useValue: documentsApiSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentDetailComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.document = mockDoc;
    fixture.detectChanges();
  });

  it('devrait être créé et afficher les informations réelles', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cours_Graphes_Ch3.pdf');
    expect(compiled.textContent).toContain('Graphes et algorithmes');
    expect(compiled.textContent).toContain('ISI');
    expect(compiled.textContent).toContain('Institut Saint Jean');
    expect(compiled.textContent).toContain('Essiane Paul');
  });

  it('bouton Télécharger désactivé si le statut n’est pas available', () => {
    component.document = { ...mockDoc, status: 'pending' };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const downloadBtn = compiled.querySelector<HTMLButtonElement>('.action-btn');
    expect(downloadBtn?.disabled).toBe(true);
    expect(downloadBtn?.getAttribute('title')).toBe(
      component.i18n.documentsPage.detail.actions.downloadTooltipPending,
    );
  });

  it('bouton Télécharger actif si le statut est available et appelle downloadDocument', () => {
    const availableFixture = TestBed.createComponent(DocumentDetailComponent);
    const availableComp = availableFixture.componentInstance;
    availableComp.isOpen = true;
    availableComp.document = { ...mockDoc, status: 'available' };
    availableFixture.detectChanges();

    const compiled = availableFixture.nativeElement as HTMLElement;
    const downloadBtn = compiled.querySelector<HTMLButtonElement>('.action-btn');
    expect(downloadBtn?.disabled).toBe(false);

    availableComp.onDownloadCurrent();
    expect(documentsApiSpy.downloadDocument).toHaveBeenCalledWith('doc-1');
  });

  it('onglet Historique n’appelle l’API qu’à l’ouverture', () => {
    expect(documentsApiSpy.getDocumentVersions).not.toHaveBeenCalled();

    component.onSelectTab('versions');
    expect(documentsApiSpy.getDocumentVersions).toHaveBeenCalledWith('doc-1');
  });

  it('onglets Aperçu et Accès n’appellent rien et affichent Bientôt disponible', () => {
    component.onSelectTab('preview');
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(component.i18n.common.comingSoon);

    component.onSelectTab('access');
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(component.i18n.common.comingSoon);

    expect(documentsApiSpy.getDocumentVersions).not.toHaveBeenCalled();
  });
});
