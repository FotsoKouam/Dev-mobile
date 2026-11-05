import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  let component: ErrorBannerComponent;
  let fixture: ComponentFixture<ErrorBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorBannerComponent);
    component = fixture.componentInstance;
    component.message = 'Erreur réseau';
    fixture.detectChanges();
  });

  it('devrait afficher le message d erreur', () => {
    expect(fixture.nativeElement.textContent).toContain('Erreur réseau');
  });

  it('devrait émettre retry lors du clic sur Réessayer', () => {
    const spy = vi.spyOn(component.retry, 'emit');
    const btn = fixture.nativeElement.querySelector('.retry-btn') as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalled();
  });
});

