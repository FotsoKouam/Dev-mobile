import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpaceAccessService } from './space-access.service.js';
import { SpaceScope, SpaceStatus } from '../space.enums.js';
import { UserStatus } from '../../users/enums/user-status.enum.js';
import { AssignmentStatus } from '../../assignments/enums/assignment-status.enum.js';

describe('SpaceAccessService', () => {
  let service: SpaceAccessService;

  let spacesRepositoryMock: any;
  let usersRepositoryMock: any;
  let assignmentsRepositoryMock: any;
  let spaceMembersRepositoryMock: any;

  // In-memory data structures
  let users: any[];
  let spaces: any[];
  let assignments: any[];
  let spaceMembers: any[];

  beforeEach(() => {
    users = [];
    spaces = [];
    assignments = [];
    spaceMembers = [];

    usersRepositoryMock = {
      findOne: vi.fn().mockImplementation(async ({ where }) => {
        return users.find((u) => u.id === where.id) || null;
      }),
    };

    spacesRepositoryMock = {
      find: vi.fn().mockImplementation(async ({ where }) => {
        return spaces.filter((s) => !where?.status || s.status === where.status);
      }),
      createQueryBuilder: vi.fn().mockImplementation(() => {
        let queryParams: any = {};

        const qb = {
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation((_clause: string, params: any) => {
            queryParams = { ...queryParams, ...params };
            return qb;
          }),
          andWhere: vi.fn().mockImplementation((_clause: string, params: any) => {
            queryParams = { ...queryParams, ...params };
            return qb;
          }),
          getMany: vi.fn().mockImplementation(async () => {
            const userId = queryParams.userId;

            // Filtrer les espaces actifs
            const activeSpaces = spaces.filter((s) => s.status === SpaceStatus.ACTIVE);

            const result = activeSpaces.filter((space) => {
              // 1. Appartenance explicite via space_members
              const isExplicitMember = spaceMembers.some(
                (m) => m.spaceId === space.id && m.userId === userId,
              );
              if (isExplicitMember) {
                return true;
              }

              // 2. Portée automatique selon les affectations actives
              const userActiveAssignments = assignments.filter(
                (a) => a.userId === userId && a.status === AssignmentStatus.ACTIVE,
              );

              if (space.scope === SpaceScope.SCHOOL) {
                return userActiveAssignments.some((a) => a.schoolId === space.schoolId);
              }

              if (space.scope === SpaceScope.PROGRAM) {
                return userActiveAssignments.some((a) => a.programId === space.scopeProgramId);
              }

              if (space.scope === SpaceScope.ROLE) {
                return userActiveAssignments.some(
                  (a) =>
                    a.schoolId === space.schoolId &&
                    (a.role?.code === space.scopeRoleCode || a.roleCode === space.scopeRoleCode),
                );
              }

              // scope === 'individual' n'a pas d'accès par portée automatique
              return false;
            });

            return result;
          }),
        };

        return qb;
      }),
    };

    assignmentsRepositoryMock = {};
    spaceMembersRepositoryMock = {};

    service = new SpaceAccessService(
      spacesRepositoryMock,
      usersRepositoryMock,
      assignmentsRepositoryMock,
      spaceMembersRepositoryMock,
    );
  });

  // Cas 1 : Portée école
  it('Portée école : un membre actif de l école voit l espace ; un membre d une autre école ne le voit pas', async () => {
    users.push({ id: 'u1', status: UserStatus.ACTIVE });
    users.push({ id: 'u2', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-school-1',
      name: 'Vie étudiante ISJ',
      scope: SpaceScope.SCHOOL,
      schoolId: 'sch-1',
      status: SpaceStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u1',
      schoolId: 'sch-1',
      programId: null,
      status: AssignmentStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u2',
      schoolId: 'sch-2',
      programId: null,
      status: AssignmentStatus.ACTIVE,
    });

    const resU1 = await service.getAccessibleSpaceIds({ id: 'u1', isPlatformAdmin: false });
    expect(resU1).toEqual(['sp-school-1']);

    const resU2 = await service.getAccessibleSpaceIds({ id: 'u2', isPlatformAdmin: false });
    expect(resU2).toEqual([]);
  });

  // Cas 2 : Portée filière
  it('Portée filière : un étudiant affecté à la filière voit l espace ; un étudiant d une autre filière de la même école ne le voit pas', async () => {
    users.push({ id: 'u-isi', status: UserStatus.ACTIVE });
    users.push({ id: 'u-srt', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-prog-isi',
      name: 'Cours ISI',
      scope: SpaceScope.PROGRAM,
      schoolId: 'sch-1',
      scopeProgramId: 'prog-isi',
      status: SpaceStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-isi',
      schoolId: 'sch-1',
      programId: 'prog-isi',
      status: AssignmentStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-srt',
      schoolId: 'sch-1',
      programId: 'prog-srt',
      status: AssignmentStatus.ACTIVE,
    });

    const resIsi = await service.getAccessibleSpaceIds({ id: 'u-isi', isPlatformAdmin: false });
    expect(resIsi).toEqual(['sp-prog-isi']);

    const resSrt = await service.getAccessibleSpaceIds({ id: 'u-srt', isPlatformAdmin: false });
    expect(resSrt).toEqual([]);
  });

  // Cas 3 : Portée rôle
  it('Portée rôle : un staff de l école voit l espace « Enseignants » ; un student ne le voit pas ; un admin_staff ne voit pas « Enseignants »', async () => {
    users.push({ id: 'u-staff', status: UserStatus.ACTIVE });
    users.push({ id: 'u-student', status: UserStatus.ACTIVE });
    users.push({ id: 'u-admin-staff', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-enseignants',
      name: 'Enseignants',
      scope: SpaceScope.ROLE,
      schoolId: 'sch-1',
      scopeRoleCode: 'staff',
      status: SpaceStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-staff',
      schoolId: 'sch-1',
      role: { code: 'staff' },
      status: AssignmentStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-student',
      schoolId: 'sch-1',
      role: { code: 'student' },
      status: AssignmentStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-admin-staff',
      schoolId: 'sch-1',
      role: { code: 'admin_staff' },
      status: AssignmentStatus.ACTIVE,
    });

    const resStaff = await service.getAccessibleSpaceIds({ id: 'u-staff', isPlatformAdmin: false });
    expect(resStaff).toEqual(['sp-enseignants']);

    const resStudent = await service.getAccessibleSpaceIds({ id: 'u-student', isPlatformAdmin: false });
    expect(resStudent).toEqual([]);

    const resAdminStaff = await service.getAccessibleSpaceIds({ id: 'u-admin-staff', isPlatformAdmin: false });
    expect(resAdminStaff).toEqual([]);
  });

  // Cas 4 : Portée individuelle
  it('Portée individuelle : un utilisateur présent dans space_members voit l espace ; un utilisateur absent ne le voit pas', async () => {
    users.push({ id: 'u-member', status: UserStatus.ACTIVE });
    users.push({ id: 'u-non-member', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-indiv',
      name: 'Projet Secret',
      scope: SpaceScope.INDIVIDUAL,
      schoolId: 'sch-1',
      status: SpaceStatus.ACTIVE,
    });

    spaceMembers.push({
      spaceId: 'sp-indiv',
      userId: 'u-member',
    });

    const resMember = await service.getAccessibleSpaceIds({ id: 'u-member', isPlatformAdmin: false });
    expect(resMember).toEqual(['sp-indiv']);

    const resNonMember = await service.getAccessibleSpaceIds({ id: 'u-non-member', isPlatformAdmin: false });
    expect(resNonMember).toEqual([]);
  });

  // Cas 5 : Ajout explicite sur une autre portée
  it('Ajout explicite sur une autre portée : un étudiant d une autre filière, ajouté dans space_members à un espace de filière, voit cet espace', async () => {
    users.push({ id: 'u-srt-guest', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-prog-isi',
      name: 'Cours ISI',
      scope: SpaceScope.PROGRAM,
      schoolId: 'sch-1',
      scopeProgramId: 'prog-isi',
      status: SpaceStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-srt-guest',
      schoolId: 'sch-1',
      programId: 'prog-srt', // autre filière
      status: AssignmentStatus.ACTIVE,
    });

    // Pas encore membre
    let res = await service.getAccessibleSpaceIds({ id: 'u-srt-guest', isPlatformAdmin: false });
    expect(res).toEqual([]);

    // Ajout explicite dans space_members
    spaceMembers.push({
      spaceId: 'sp-prog-isi',
      userId: 'u-srt-guest',
    });

    res = await service.getAccessibleSpaceIds({ id: 'u-srt-guest', isPlatformAdmin: false });
    expect(res).toEqual(['sp-prog-isi']);
  });

  // Cas 6 : Cas de refus
  it('Cas de refus : un utilisateur sans affectation active ni space_members ne reçoit aucun espace', async () => {
    users.push({ id: 'u-empty', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-1',
      name: 'Espace 1',
      scope: SpaceScope.SCHOOL,
      schoolId: 'sch-1',
      status: SpaceStatus.ACTIVE,
    });

    const res = await service.getAccessibleSpaceIds({ id: 'u-empty', isPlatformAdmin: false });
    expect(res).toEqual([]);
  });

  // Cas 7 : Affectation inactive
  it('Affectation inactive : une affectation status = "inactive" ne donne plus accès à la portée correspondante', async () => {
    users.push({ id: 'u-inactive-assign', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-school',
      name: 'Espace École',
      scope: SpaceScope.SCHOOL,
      schoolId: 'sch-1',
      status: SpaceStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-inactive-assign',
      schoolId: 'sch-1',
      status: AssignmentStatus.INACTIVE,
    });

    const res = await service.getAccessibleSpaceIds({ id: 'u-inactive-assign', isPlatformAdmin: false });
    expect(res).toEqual([]);
  });

  // Cas 8 : Espace inactif
  it('Espace inactif : un espace status = "inactive" n apparaît dans aucun résultat, même pour un membre', async () => {
    users.push({ id: 'u-active', status: UserStatus.ACTIVE });

    spaces.push({
      id: 'sp-archived',
      name: 'Ancien Espace',
      scope: SpaceScope.SCHOOL,
      schoolId: 'sch-1',
      status: SpaceStatus.INACTIVE,
    });

    assignments.push({
      userId: 'u-active',
      schoolId: 'sch-1',
      status: AssignmentStatus.ACTIVE,
    });

    spaceMembers.push({
      spaceId: 'sp-archived',
      userId: 'u-active',
    });

    const res = await service.getAccessibleSpaceIds({ id: 'u-active', isPlatformAdmin: false });
    expect(res).toEqual([]);
  });

  // Cas 9 : Compte suspendu
  it('Compte suspendu : retourne une liste vide', async () => {
    users.push({ id: 'u-suspended', status: UserStatus.SUSPENDED });

    spaces.push({
      id: 'sp-school',
      name: 'Espace École',
      scope: SpaceScope.SCHOOL,
      schoolId: 'sch-1',
      status: SpaceStatus.ACTIVE,
    });

    assignments.push({
      userId: 'u-suspended',
      schoolId: 'sch-1',
      status: AssignmentStatus.ACTIVE,
    });

    spaceMembers.push({
      spaceId: 'sp-school',
      userId: 'u-suspended',
    });

    const res = await service.getAccessibleSpaceIds({ id: 'u-suspended', isPlatformAdmin: false });
    expect(res).toEqual([]);
  });

  // Cas 10 : platform_admin
  it('platform_admin : retourne tous les espaces actifs', async () => {
    users.push({ id: 'u-admin', status: UserStatus.ACTIVE });

    spaces.push(
      {
        id: 'sp-1',
        name: 'Espace 1',
        scope: SpaceScope.SCHOOL,
        schoolId: 'sch-1',
        status: SpaceStatus.ACTIVE,
      },
      {
        id: 'sp-2',
        name: 'Espace 2',
        scope: SpaceScope.INDIVIDUAL,
        schoolId: 'sch-2',
        status: SpaceStatus.ACTIVE,
      },
      {
        id: 'sp-inactive',
        name: 'Espace Inactif',
        scope: SpaceScope.PROGRAM,
        schoolId: 'sch-1',
        status: SpaceStatus.INACTIVE,
      },
    );

    const res = await service.getAccessibleSpaceIds({ id: 'u-admin', isPlatformAdmin: true });
    expect(res).toHaveLength(2);
    expect(res).toContain('sp-1');
    expect(res).toContain('sp-2');
    expect(res).not.toContain('sp-inactive');
  });
});
