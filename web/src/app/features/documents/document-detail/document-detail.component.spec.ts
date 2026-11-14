import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentDetailComponent } from './document-detail.component';
import { DocumentItem } from '../../../core/api/models/document.model';

describe('DocumentDetailComponent', () => {
  let component: DocumentDetailComponent;
  let fixture: ComponentFixture<DocumentDetailComponent>;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentDetailComponent],
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

  it('devrait contenir les 4 onglets demandés', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tabButtons = compiled.querySelectorAll('.tab-btn');
    expect(tabButtons.length).toBe(4);
  });

  it('les onglets Aperçu, Accès et Historique n appellent pas d API et affichent Bientôt disponible', () => {
    component.activeTab.set('preview');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(component.i18n.common.comingSoon);

    component.activeTab.set('access');
    fixture.detectChanges();
    expect(compiled.textContent).toContain(component.i18n.common.comingSoon);

    component.activeTab.set('versions');
    fixture.detectChanges();
    expect(compiled.textContent).toContain(component.i18n.common.comingSoon);
  });

  it('tous les boutons d action doivent être désactivés avec l info-bulle Bientôt disponible', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const actionButtons = compiled.querySelectorAll<HTMLButtonElement>('.action-btn');
    expect(actionButtons.length).toBe(4);

    actionButtons.forEach((btn) => {
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute('title')).toBe(component.i18n.common.comingSoon);
    });
  });
});
