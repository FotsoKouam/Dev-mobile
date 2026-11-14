import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { DocumentUploadComponent } from './document-upload.component';
import { DocumentsApiService } from '../../../core/api/documents-api.service';
import { SpacesApiService } from '../../../core/api/spaces-api.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { API_CONFIG } from '../../../core/api.config';
import { Space } from '../../../core/api/models/space.model';
import { DocumentItem } from '../../../core/api/models/document.model';

describe('DocumentUploadComponent', () => {
  let component: DocumentUploadComponent;
  let fixture: ComponentFixture<DocumentUploadComponent>;
  let documentsApiSpy: any;
  let spacesApiSpy: any;
  let toastSpy: any;

  const mockSpace: Space = {
    id: 'sp-1',
    name: 'Graphes et algorithmes',
    description: null,
    type: 'institutional',
    status: 'active',
    school: { id: 'sch-1', name: 'Institut Saint Jean' },
    program: { id: 'prog-1', name: 'ISI' },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(async () => {
    documentsApiSpy = {
      uploadDocument: vi.fn().mockReturnValue(
        of({
          id: 'doc-1',
          name: 'Cours.pdf',
          status: 'pending',
          fileType: 'pdf',
        } as DocumentItem),
      ),
    };

    spacesApiSpy = {
      getSpaces: vi.fn().mockReturnValue(
        of({
          data: [mockSpace],
          meta: { page: 1, limit: 100, total: 1 },
        }),
      ),
    };

    toastSpy = {
      success: vi.fn(),
      toasts: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentUploadComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
        { provide: DocumentsApiService, useValue: documentsApiSpy },
        { provide: SpacesApiService, useValue: spacesApiSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentUploadComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait être créé et charger les espaces', () => {
    expect(component).toBeTruthy();
    expect(spacesApiSpy.getSpaces).toHaveBeenCalled();
    expect(component.availableSpaces().length).toBe(1);
  });

  it('exige la sélection d un fichier et d un espace', () => {
    component.onSubmit();
    expect(component.spaceError()).toBeTruthy();
    expect(component.fileError()).toBeTruthy();
    expect(documentsApiSpy.uploadDocument).not.toHaveBeenCalled();
  });

  it('refuse une extension non autorisée côté client', () => {
    const fakeTxtFile = new File(['hello'], 'note.txt', { type: 'text/plain' });
    const event = {
      target: {
        files: [fakeTxtFile],
        value: 'note.txt',
      },
    } as any;

    component.onFileSelected(event);

    expect(component.fileError()).toBe(
      component.i18n.documentsPage.uploadModal.errors.invalidExtension,
    );
    expect(component.selectedFile()).toBeNull();
  });

  it('refuse un fichier de plus de 20 Mo côté client', () => {
    const hugeBlob = new Blob([new Uint8Array(21 * 1024 * 1024)]);
    const hugeFile = new File([hugeBlob], 'huge.pdf', { type: 'application/pdf' });
    const event = {
      target: {
        files: [hugeFile],
        value: 'huge.pdf',
      },
    } as any;

    component.onFileSelected(event);

    expect(component.fileError()).toBe(
      component.i18n.documentsPage.uploadModal.errors.maxSizeExceeded,
    );
    expect(component.selectedFile()).toBeNull();
  });

  it('affiche l erreur 400 dans la fenêtre en cas de rejet serveur', () => {
    documentsApiSpy.uploadDocument.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'Format invalide détecté par les octets' },
      })),
    );

    const validBlob = new Blob(['%PDF-1.4 content'], { type: 'application/pdf' });
    const validFile = new File([validBlob], 'test.pdf', { type: 'application/pdf' });

    component.selectedSpaceId.set('sp-1');
    component.selectedFile.set(validFile);

    component.onSubmit();

    expect(component.serverError()).toBe('Format invalide détecté par les octets');
  });

  it('affiche l erreur 413 dans la fenêtre si le serveur indique le fichier trop grand', () => {
    documentsApiSpy.uploadDocument.mockReturnValue(
      throwError(() => ({
        status: 413,
        error: { message: 'Fichier trop volumineux' },
      })),
    );

    const validBlob = new Blob(['%PDF-1.4 content'], { type: 'application/pdf' });
    const validFile = new File([validBlob], 'test.pdf', { type: 'application/pdf' });

    component.selectedSpaceId.set('sp-1');
    component.selectedFile.set(validFile);

    component.onSubmit();

    expect(component.serverError()).toBe('Fichier trop volumineux');
  });

  it('affiche l erreur 409 si l espace est inactif', () => {
    documentsApiSpy.uploadDocument.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Espace inactif' },
      })),
    );

    const validBlob = new Blob(['%PDF-1.4 content'], { type: 'application/pdf' });
    const validFile = new File([validBlob], 'test.pdf', { type: 'application/pdf' });

    component.selectedSpaceId.set('sp-1');
    component.selectedFile.set(validFile);

    component.onSubmit();

    expect(component.serverError()).toBe(
      component.i18n.documentsPage.uploadModal.errors.conflictSpace,
    );
  });
});
