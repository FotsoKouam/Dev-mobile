import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    component.title = 'Modal test';
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait afficher le titre de la modale', () => {
    expect(fixture.nativeElement.textContent).toContain('Modal test');
  });

  it('devrait émettre closeModal sur Échap', () => {
    const spy = vi.spyOn(component.closeModal, 'emit');
    component.onEscape();
    expect(spy).toHaveBeenCalled();
  });
});

