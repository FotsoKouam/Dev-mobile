import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('devrait afficher "Actif" pour status active', () => {
    component.status = 'active';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Actif');
  });

  it('devrait afficher "Inactif" pour status inactive', () => {
    component.status = 'inactive';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Inactif');
  });
});

