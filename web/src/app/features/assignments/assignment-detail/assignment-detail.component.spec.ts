import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AssignmentDetailComponent } from './assignment-detail.component';
import { AssignmentsApiService } from '../../../core/api/assignments-api.service';
import { Assignment } from '../../../core/api/models/assignment.model';
import { User } from '../../../core/api/models/user.model';

describe('AssignmentDetailComponent', () => {
  let component: AssignmentDetailComponent;
  let fixture: ComponentFixture<AssignmentDetailComponent>;
  let apiSpy: any;

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

  const mockUser: User = {
    id: 'u1',
    firstName: 'Paul',
    lastName: 'Essiane',
    email: 'paul@campusia.cm',
    phone: null,
    lastLoginAt: null,
    authMethod: 'google',
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    assignments: [
      {
        id: 'a1',
        role: { id: 'r1', code: 'staff', name: 'Personnel' },
        school: { id: 's1', name: 'Saint Jean' },
        program: { id: 'p1', name: 'ISI' },
        status: 'active',
      },
      {
        id: 'a2',
        role: { id: 'r2', code: 'student', name: 'Étudiant' },
        school: { id: 's1', name: 'Saint Jean' },
        program: { id: 'p2', name: 'SRT' },
        status: 'active',
      },
    ],
  };

  beforeEach(async () => {
    apiSpy = {
      getUser: vi.fn().mockReturnValue(of(mockUser)),
    };

    await TestBed.configureTestingModule({
      imports: [AssignmentDetailComponent],
      providers: [{ provide: AssignmentsApiService, useValue: apiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentDetailComponent);
    component = fixture.componentInstance;
    component.assignment = mockAssignment;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait basculer entre les deux onglets', () => {
    component.selectTab('history');
    expect(component.currentTab()).toBe('history');
    expect(component.activeTab).toBe('history');

    component.selectTab('assignment');
    expect(component.currentTab()).toBe('assignment');
  });

  it('l onglet historique ne doit pas appeler l API', () => {
    apiSpy.getUser.mockClear();
    component.selectTab('history');
    expect(apiSpy.getUser).not.toHaveBeenCalled();
  });

  it('devrait charger les autres affectations sans clic utilisateur', () => {
    component.loadOtherAssignments();
    expect(apiSpy.getUser).toHaveBeenCalledWith('u1');
    expect(component.otherAssignments().length).toBe(1);
    expect(component.otherAssignments()[0].id).toBe('a2');
  });

  it('devrait désactiver le retrait sur sa propre affectation d administrateur', () => {
    component.assignment = {
      ...mockAssignment,
      role: { id: 'r0', code: 'platform_admin', name: 'Administrateur plateforme' },
    };
    component.currentSessionUserId = 'u1';
    expect(component.isSelfAdmin).toBe(true);
  });
});
