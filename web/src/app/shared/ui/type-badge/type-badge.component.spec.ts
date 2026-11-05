import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypeBadgeComponent } from './type-badge.component';

describe('TypeBadgeComponent', () => {
  let component: TypeBadgeComponent;
  let fixture: ComponentFixture<TypeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TypeBadgeComponent);
    component = fixture.componentInstance;
  });

  it('devrait afficher "Public" pour type public', () => {
    component.type = 'public';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Public');
  });

  it('devrait afficher "Privé" pour type private', () => {
    component.type = 'private';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Privé');
  });
});

