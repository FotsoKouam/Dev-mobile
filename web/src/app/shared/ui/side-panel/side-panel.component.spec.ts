import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidePanelComponent } from './side-panel.component';

describe('SidePanelComponent', () => {
  let component: SidePanelComponent;
  let fixture: ComponentFixture<SidePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidePanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SidePanelComponent);
    component = fixture.componentInstance;
    component.title = 'Panneau test';
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait afficher le titre du panneau', () => {
    expect(fixture.nativeElement.textContent).toContain('Panneau test');
  });

  it('devrait émettre closePanel sur Échap', () => {
    const spy = vi.spyOn(component.closePanel, 'emit');
    component.onEscape();
    expect(spy).toHaveBeenCalled();
  });

  it('devrait émettre closePanel sur clic fond', () => {
    const spy = vi.spyOn(component.closePanel, 'emit');
    component.onBackdropClick();
    expect(spy).toHaveBeenCalled();
  });
});

