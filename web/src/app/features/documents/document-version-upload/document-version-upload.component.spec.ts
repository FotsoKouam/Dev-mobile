import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentVersionUploadComponent } from './document-version-upload.component';
import { DocumentsApiService } from '../../../core/api/documents-api.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DocumentItem } from '../../../core/api/models/document.model';

describe('DocumentVersionUploadComponent', () => {
  let component: DocumentVersionUploadComponent;
  let fixture: ComponentFixture<DocumentVersionUploadComponent>;
  let documentsApiSpy: {
    addDocumentVersion: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
  };

  const mockDoc: DocumentItem = {
    id: 'doc-1',
    name: 'test.pdf',
    fileType: 'pdf',
    status: 'available',
    version: 1,
    space: { id: 'sp-1', name: 'Espace' },
    uploadedBy: { id: 'u-1', name: 'User' },
    sizeBytes: 1024,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    documentsApiSpy = {
      addDocumentVersion: vi.fn().mockReturnValue(of({ ...mockDoc, version: 2 })),
    };
    toastServiceSpy = {
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentVersionUploadComponent],
      providers: [
        { provide: DocumentsApiService, useValue: documentsApiSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentVersionUploadComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.document = mockDoc;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('bloque la soumission si aucun fichier n’est sélectionné', () => {
    component.onSubmit();
    expect(component.fileError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.fileRequired,
    );
    expect(documentsApiSpy.addDocumentVersion).not.toHaveBeenCalled();
  });

  it('refuse une extension non autorisée (.txt)', () => {
    const file = new File(['text'], 'document.txt', { type: 'text/plain' });
    component.handleFile(file);

    expect(component.selectedFile()).toBeNull();
    expect(component.fileError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.invalidExtension,
    );
  });

  it('refuse un fichier dépassant 20 Mo', () => {
    const largeFile = new File([''], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 25 * 1024 * 1024 });

    component.handleFile(largeFile);
    expect(component.selectedFile()).toBeNull();
    expect(component.fileError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.maxSizeExceeded,
    );
  });

  it('affiche le message d’erreur 413 du serveur dans la fenêtre', () => {
    const validFile = new File(['pdf data'], 'v2.pdf', { type: 'application/pdf' });
    component.handleFile(validFile);

    documentsApiSpy.addDocumentVersion.mockReturnValue(
      throwError(() => ({ status: 413 })),
    );

    component.onSubmit();
    expect(component.serverError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.payloadTooLarge,
    );
  });

  it('affiche le message d’erreur 409 du serveur dans la fenêtre', () => {
    const validFile = new File(['pdf data'], 'v2.pdf', { type: 'application/pdf' });
    component.handleFile(validFile);

    documentsApiSpy.addDocumentVersion.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );

    component.onSubmit();
    expect(component.serverError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.conflictDocument,
    );
  });

  it('affiche le message d’erreur 403 du serveur dans la fenêtre', () => {
    const validFile = new File(['pdf data'], 'v2.pdf', { type: 'application/pdf' });
    component.handleFile(validFile);

    documentsApiSpy.addDocumentVersion.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    component.onSubmit();
    expect(component.serverError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.forbidden,
    );
  });

  it('affiche le message d’erreur 400 du serveur dans la fenêtre', () => {
    const validFile = new File(['pdf data'], 'v2.pdf', { type: 'application/pdf' });
    component.handleFile(validFile);

    documentsApiSpy.addDocumentVersion.mockReturnValue(
      throwError(() => ({ status: 400 })),
    );

    component.onSubmit();
    expect(component.serverError()).toBe(
      component.i18n.documentsPage.versionUploadModal.errors.typeNotAllowed,
    );
  });

  it('bloque la soumission native (preventDefault/stopPropagation) et appelle addDocumentVersion avec le File sélectionné', () => {
    const validFile = new File(['pdf data'], 'v2.pdf', { type: 'application/pdf' });
    component.handleFile(validFile);

    const event = new Event('click');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    component.onSubmit(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(documentsApiSpy.addDocumentVersion).toHaveBeenCalledWith('doc-1', validFile);
  });
});
