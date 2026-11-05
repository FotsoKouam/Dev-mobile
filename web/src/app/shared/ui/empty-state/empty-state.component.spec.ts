import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    component.title = 'Aucun élément';
    component.description = 'Description optionnelle';
    component.actionLabel = 'Ajouter';
    fixture.detectChanges();
  });

  it('devrait afficher le titre, la description et le bouton', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Aucun élément');
    expect(el.textContent).toContain('Description optionnelle');
    expect(el.textContent).toContain('Ajouter');
  });

  it('devrait émettre action lors du clic', () => {
    const spy = vi.spyOn(component.action, 'emit');
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalled();
  });
});

