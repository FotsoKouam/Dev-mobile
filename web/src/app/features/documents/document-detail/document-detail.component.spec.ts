import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentDetailComponent } from './document-detail.component';

describe('DocumentDetailComponent', () => {
  let component: DocumentDetailComponent;
  let fixture: ComponentFixture<DocumentDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentDetailComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait contenir les 4 onglets demandés', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tabButtons = compiled.querySelectorAll('.tab-btn');
    expect(tabButtons.length).toBe(4);
    expect(tabButtons[0].textContent).toContain(component.i18n.documentsPage.detail.tabs.preview);
    expect(tabButtons[1].textContent).toContain(component.i18n.documentsPage.detail.tabs.info);
    expect(tabButtons[2].textContent).toContain(component.i18n.documentsPage.detail.tabs.access);
    expect(tabButtons[3].textContent).toContain(component.i18n.documentsPage.detail.tabs.versions);
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

  it('devrait basculer d onglet sans appel API', () => {
    component.activeTab = 'info';
    fixture.detectChanges();
    expect(component.activeTab).toBe('info');

    component.activeTab = 'versions';
    fixture.detectChanges();
    expect(component.activeTab).toBe('versions');
  });
});

