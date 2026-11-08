import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignmentRemoveDialogComponent } from './assignment-remove-dialog.component';
import { Assignment } from '../../../core/api/models/assignment.model';

describe('AssignmentRemoveDialogComponent', () => {
  let component: AssignmentRemoveDialogComponent;
  let fixture: ComponentFixture<AssignmentRemoveDialogComponent>;

  const mockAssignment: Assignment = {
    id: 'a1',
    user: { id: 'u1', firstName: 'Paul', lastName: 'Essiane', email: 'paul@campusia.cm' },
    role: { id: 'r1', code: 'staff', name: 'Personnel' },
    school: { id: 's1', name: 'Saint Jean' },
    program: { id: 'p1', name: 'ISI' },
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentRemoveDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentRemoveDialogComponent);
    component = fixture.componentInstance;
    component.assignment = mockAssignment;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait émettre dialogCancel au clic sur annuler', () => {
    const cancelSpy = vi.spyOn(component.dialogCancel, 'emit');
    component.cancel();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('devrait émettre dialogConfirm avec l affectation à retirer', () => {
    const confirmSpy = vi.spyOn(component.dialogConfirm, 'emit');
    component.confirm();
    expect(confirmSpy).toHaveBeenCalledWith(mockAssignment);
  });
});

