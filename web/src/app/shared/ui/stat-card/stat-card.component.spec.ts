import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    component.label = 'Écoles actives';
    component.value = 4;
    component.subtext = 'sur 5 écoles au total';
    component.loading = false;
    fixture.detectChanges();
  });

  it('devrait afficher le libellé, la valeur et le sous-texte', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Écoles actives');
    expect(el.textContent).toContain('4');
    expect(el.textContent).toContain('sur 5 écoles au total');
  });

  it('devrait afficher un squelette en mode loading', () => {
    const loadingFixture = TestBed.createComponent(StatCardComponent);
    const loadingComp = loadingFixture.componentInstance;
    loadingComp.label = 'Écoles actives';
    loadingComp.loading = true;
    loadingFixture.detectChanges();

    const el = loadingFixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skeleton-val')).toBeTruthy();
  });
});
