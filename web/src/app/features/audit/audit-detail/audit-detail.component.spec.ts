import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditDetailComponent } from './audit-detail.component';
import { AuditLogItem } from '../../../core/api/models/audit.model';

describe('AuditDetailComponent', () => {
  let component: AuditDetailComponent;
  let fixture: ComponentFixture<AuditDetailComponent>;

  const mockItemWithDetails: AuditLogItem = {
    id: 'log-1',
    createdAt: '2026-11-03T22:12:00.000Z',
    action: 'login_failure',
    result: 'failure',
    target: null,
    user: null,
    ipAddress: '198.51.100.7',
    details: {
      emailAttempted: 'inconnu@example.com',
      failureReason: 'Identifiants incorrects',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142',
    },
  };

  const mockItemWithoutOptionalDetails: AuditLogItem = {
    id: 'log-2',
    createdAt: '2026-11-03T22:41:00.000Z',
    action: 'login_success',
    result: 'success',
    target: null,
    user: {
      id: 'u-1',
      firstName: 'Paul',
      lastName: 'Essiane',
      role: 'platform_admin',
    },
    ipAddress: '192.0.2.14',
    details: {
      emailAttempted: null,
      failureReason: null,
      userAgent: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditDetailComponent);
    component = fixture.componentInstance;
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('affiche emailAttempted seulement si présent', () => {
    component.isOpen = true;
    component.auditLog = mockItemWithDetails;
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('inconnu@example.com');
    expect(compiled.textContent).toContain('Identifiants incorrects');

    // Nouveau composant / fixture pour tester sans emailAttempted
    const fixture2 = TestBed.createComponent(AuditDetailComponent);
    const comp2 = fixture2.componentInstance;
    comp2.isOpen = true;
    comp2.auditLog = mockItemWithoutOptionalDetails;
    fixture2.detectChanges();

    compiled = fixture2.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('inconnu@example.com');
  });

  it('userAgent absent n affiche pas la section Informations complémentaires', () => {
    // 1. Sans userAgent
    component.isOpen = true;
    component.auditLog = mockItemWithoutOptionalDetails;
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Informations complémentaires');

    // 2. Avec userAgent sur un nouveau composant
    const fixture2 = TestBed.createComponent(AuditDetailComponent);
    const comp2 = fixture2.componentInstance;
    comp2.isOpen = true;
    comp2.auditLog = mockItemWithDetails;
    fixture2.detectChanges();

    compiled = fixture2.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Informations complémentaires');
    expect(compiled.textContent).toContain('Mozilla/5.0');
  });

  it('émet panelClosed lors du clic sur le bouton Fermer', () => {
    const spy = vi.spyOn(component.panelClosed, 'emit');
    component.isOpen = true;
    component.auditLog = mockItemWithDetails;
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn-action') as HTMLButtonElement;
    closeBtn.click();
    expect(spy).toHaveBeenCalled();
  });
});
