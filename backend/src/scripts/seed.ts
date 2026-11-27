import pg from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as argon2 from 'argon2';

// 1. Charger .env si présent
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// 2. Vérifier DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim() === '') {
  console.error('DATABASE_URL est manquante : voir backend/.env.example');
  process.exit(1);
}

const isSsl = process.env.DATABASE_SSL === 'true';

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: isSsl ? { rejectUnauthorized: true } : false,
});

interface SeedProgram {
  name: string;
  status: 'active' | 'inactive';
}

interface SeedSchool {
  name: string;
  type: 'public' | 'private';
  city: string;
  status: 'active' | 'inactive';
  programs: SeedProgram[];
}

const seedData: SeedSchool[] = [
  {
    name: 'Institut Universitaire Saint Jean',
    type: 'private',
    city: 'Yaoundé',
    status: 'active',
    programs: [
      { name: 'ISI', status: 'active' },
      { name: 'SRT', status: 'active' },
      { name: 'Gestion', status: 'active' },
    ],
  },
  {
    name: 'Université de Douala',
    type: 'public',
    city: 'Douala',
    status: 'active',
    programs: [
      { name: 'Informatique', status: 'active' },
      { name: 'Mathématiques', status: 'active' },
    ],
  },
  {
    name: 'CETIC de Bafoussam',
    type: 'public',
    city: 'Bafoussam',
    status: 'active',
    programs: [
      { name: 'Électrotechnique', status: 'active' },
      { name: 'Comptabilité', status: 'active' },
    ],
  },
  {
    name: 'Institut Polytechnique de Yaoundé',
    type: 'private',
    city: 'Yaoundé',
    status: 'active',
    programs: [
      { name: 'Génie civil', status: 'active' },
      { name: 'Génie électrique', status: 'active' },
    ],
  },
  {
    name: 'Collège Saint Michel',
    type: 'private',
    city: 'Douala',
    status: 'inactive',
    programs: [{ name: 'Série C', status: 'inactive' }],
  },
];

interface SeedRole {
  code: 'platform_admin' | 'school_admin' | 'staff' | 'student' | 'guest';
  name: string;
  description: string;
  permissions: string[];
}

const rolesData: SeedRole[] = [
  {
    code: 'platform_admin',
    name: 'Administrateur plateforme',
    description: 'Accès global à toutes les écoles et fonctions d administration',
    permissions: [
      'manage_schools',
      'manage_programs',
      'manage_users',
      'manage_roles',
      'manage_assignments',
      'manage_spaces',
      'add_document',
      'replace_or_delete_document',
      'view_audit_log',
      'access_all_schools',
    ],
  },
  {
    code: 'school_admin',
    name: 'Administrateur école',
    description: 'Administration de son établissement et de toutes ses filières',
    permissions: [
      'manage_programs',
      'manage_users',
      'manage_assignments',
      'manage_spaces',
      'add_document',
      'replace_or_delete_document',
      'view_audit_log',
    ],
  },
  {
    code: 'staff',
    name: 'Personnel',
    description: 'Ajout de documents aux espaces institutionnels de sa filière',
    permissions: ['add_document', 'replace_or_delete_document'],
  },
  {
    code: 'student',
    name: 'Étudiant',
    description: 'Consultation des espaces institutionnels de sa filière (mobile)',
    permissions: [],
  },
  {
    code: 'guest',
    name: 'Parent/invité',
    description: 'Consultation des espaces partagés explicitement (mobile)',
    permissions: [],
  },
];

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  authMethod: 'google' | 'password';
  status: 'active' | 'inactive' | 'suspended' | 'invited';
  roleCode: 'platform_admin' | 'school_admin' | 'staff' | 'student' | 'guest';
  schoolName?: string;
  programName?: string;
}

const usersData: SeedUser[] = [
  {
    firstName: 'Fatso',
    lastName: 'Admin',
    email: 'fatso.admin@example.com',
    authMethod: 'password',
    status: 'active',
    roleCode: 'platform_admin',
  },
  {
    firstName: 'Jean Pierre',
    lastName: 'Mbarga',
    email: 'jean.pierre.mbarga@example.com',
    authMethod: 'password',
    status: 'active',
    roleCode: 'school_admin',
    schoolName: 'Institut Universitaire Saint Jean',
  },
  {
    firstName: 'Paul',
    lastName: 'Essiane',
    email: 'paul.essiane@example.com',
    authMethod: 'google',
    status: 'active',
    roleCode: 'staff',
    schoolName: 'Institut Universitaire Saint Jean',
    programName: 'ISI',
  },
  {
    firstName: 'Anne',
    lastName: 'Tchinda',
    email: 'anne.tchinda@example.com',
    authMethod: 'google',
    status: 'active',
    roleCode: 'staff',
    schoolName: 'Institut Universitaire Saint Jean',
    programName: 'SRT',
  },
  {
    firstName: 'Marie',
    lastName: 'Nguéma',
    email: 'marie.nguema@example.com',
    authMethod: 'google',
    status: 'active',
    roleCode: 'student',
    schoolName: 'Institut Universitaire Saint Jean',
    programName: 'ISI',
  },
  {
    firstName: 'Victor',
    lastName: 'Tambe',
    email: 'victor.tambe@example.com',
    authMethod: 'google',
    status: 'active',
    roleCode: 'student',
    schoolName: 'Université de Douala',
    programName: 'Informatique',
  },
  {
    firstName: 'Sophie',
    lastName: 'Moukengue',
    email: 'sophie.moukengue@example.com',
    authMethod: 'google',
    status: 'invited',
    roleCode: 'guest',
    schoolName: 'Institut Universitaire Saint Jean',
  },
  {
    firstName: 'Fatou',
    lastName: 'Ntsama',
    email: 'fatou.ntsama@example.com',
    authMethod: 'google',
    status: 'inactive',
    roleCode: 'staff',
    schoolName: 'Institut Polytechnique de Yaoundé',
    programName: 'Génie civil',
  },
  {
    firstName: 'Samuel',
    lastName: 'Mpiabé',
    email: 'samuel.mpiabe@example.com',
    authMethod: 'google',
    status: 'suspended',
    roleCode: 'student',
    schoolName: 'CETIC de Bafoussam',
    programName: 'Électrotechnique',
  },
];

async function seed() {
  try {
    // Vérification de ADMIN_SEED_PASSWORD pour les comptes password
    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
    if (!adminSeedPassword || adminSeedPassword.trim() === '') {
      console.error('ADMIN_SEED_PASSWORD est manquante : voir backend/.env.example');
      process.exit(1);
    }

    await client.connect();
    console.log('Connexion à la base de données établie pour le seed.');

    let insertedSchools = 0;
    let insertedPrograms = 0;

    for (const school of seedData) {
      const schoolResult = await client.query<{ id: string }>(
        `INSERT INTO schools (name, type, city, main_language, status)
         VALUES ($1, $2, $3, 'fr', $4)
         ON CONFLICT (name) DO UPDATE
           SET type = EXCLUDED.type,
               city = EXCLUDED.city,
               status = EXCLUDED.status
         RETURNING id;`,
        [school.name, school.type, school.city, school.status],
      );

      const schoolId = schoolResult.rows[0].id;
      insertedSchools++;

      for (const program of school.programs) {
        await client.query(
          `INSERT INTO programs (school_id, name, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (school_id, name) DO UPDATE
             SET status = EXCLUDED.status
           RETURNING id;`,
          [schoolId, program.name, program.status],
        );
        insertedPrograms++;
      }
    }

    console.log(`Écoles et filières : ${insertedSchools} écoles, ${insertedPrograms} filières traitées.`);

    // 2. Roles & Permissions (idempotent)
    let processedRoles = 0;
    const roleIdByCode: Record<string, string> = {};

    for (const role of rolesData) {
      const roleResult = await client.query<{ id: string }>(
        `INSERT INTO roles (code, name, description, is_system, status)
         VALUES ($1, $2, $3, true, 'active')
         ON CONFLICT (code) DO UPDATE
           SET name = EXCLUDED.name,
               description = EXCLUDED.description
         RETURNING id;`,
        [role.code, role.name, role.description],
      );

      const roleId = roleResult.rows[0].id;
      roleIdByCode[role.code] = roleId;
      processedRoles++;

      // Synchroniser permissions idempotemment
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      for (const perm of role.permissions) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_code)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING;`,
          [roleId, perm],
        );
      }
    }

    console.log(`Rôles et permissions : ${processedRoles} rôles système initialisés.`);

    // 3. Utilisateurs & Affectations (idempotent)
    let processedUsers = 0;
    let processedAssignments = 0;

    const adminHashedPassword = await argon2.hash(adminSeedPassword);

    for (const u of usersData) {
      // Pour les comptes avec authMethod password, renseigner password_hash si non existant
      const existingUser = await client.query<{ id: string; password_hash: string | null }>(
        `SELECT id, password_hash FROM users WHERE email = $1`,
        [u.email],
      );

      let userId: string;

      if (existingUser.rows.length === 0) {
        const passwordHashToInsert = u.authMethod === 'password' ? adminHashedPassword : null;
        const userRes = await client.query<{ id: string }>(
          `INSERT INTO users (email, first_name, last_name, auth_method, status, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id;`,
          [u.email, u.firstName, u.lastName, u.authMethod, u.status, passwordHashToInsert],
        );
        userId = userRes.rows[0].id;
      } else {
        userId = existingUser.rows[0].id;
        // Si le compte password n'a pas encore de mot de passe, l'initialiser
        if (u.authMethod === 'password' && !existingUser.rows[0].password_hash) {
          await client.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [adminHashedPassword, userId],
          );
        }
        await client.query(
          `UPDATE users SET first_name = $1, last_name = $2, status = $3, auth_method = $4 WHERE id = $5`,
          [u.firstName, u.lastName, u.status, u.authMethod, userId],
        );
      }

      processedUsers++;

      const roleId = roleIdByCode[u.roleCode];
      let schoolId: string | null = null;
      let programId: string | null = null;

      if (u.schoolName) {
        const schRes = await client.query<{ id: string }>(
          `SELECT id FROM schools WHERE name = $1`,
          [u.schoolName],
        );
        if (schRes.rows.length > 0) {
          schoolId = schRes.rows[0].id;
        }
      }

      if (u.programName && schoolId) {
        const progRes = await client.query<{ id: string }>(
          `SELECT id FROM programs WHERE school_id = $1 AND name = $2`,
          [schoolId, u.programName],
        );
        if (progRes.rows.length > 0) {
          programId = progRes.rows[0].id;
        }
      }

      // Insérer ou mettre à jour l'affectation correspondante
      await client.query(
        `INSERT INTO assignments (user_id, role_id, school_id, program_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT ("user_id", "role_id",
           COALESCE("school_id", '00000000-0000-0000-0000-000000000000'::uuid),
           COALESCE("program_id", '00000000-0000-0000-0000-000000000000'::uuid)
         ) DO UPDATE SET status = EXCLUDED.status;`,
        [userId, roleId, schoolId, programId],
      );
      processedAssignments++;
    }

    console.log(`Utilisateurs et affectations : ${processedUsers} utilisateurs, ${processedAssignments} affectations traitées.`);

    // 6. Espaces selon modèle ADR 0003
    interface SeedSpace {
      schoolName: string;
      name: string;
      scope: 'school' | 'program' | 'role' | 'individual';
      programName?: string;
      roleCode?: string;
      description?: string;
    }

    const spacesData: SeedSpace[] = [
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Institutionnel',
        scope: 'school',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Règlement de l\'école',
        scope: 'school',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Calendrier académique',
        scope: 'school',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Étudiants ISI',
        scope: 'program',
        programName: 'ISI',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Étudiants SRT',
        scope: 'program',
        programName: 'SRT',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Étudiants Gestion',
        scope: 'program',
        programName: 'Gestion',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Enseignants',
        scope: 'role',
        roleCode: 'staff',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Personnel administratif',
        scope: 'role',
        roleCode: 'staff',
      },
      {
        schoolName: 'Institut Universitaire Saint Jean',
        name: 'Parents / invités',
        scope: 'individual',
      },
    ];

    let insertedSpaces = 0;
    const spaceIdByName: Record<string, string> = {};

    for (const s of spacesData) {
      const schRes = await client.query<{ id: string }>(
        `SELECT id FROM schools WHERE name = $1`,
        [s.schoolName],
      );
      if (schRes.rows.length === 0) {
        console.warn(`École ${s.schoolName} introuvable, espace ${s.name} ignoré.`);
        continue;
      }
      const schoolId = schRes.rows[0].id;

      let scopeProgramId: string | null = null;
      let scopeRoleCode: string | null = null;

      if (s.scope === 'program') {
        const progRes = await client.query<{ id: string }>(
          `SELECT id FROM programs WHERE school_id = $1 AND name = $2`,
          [schoolId, s.programName],
        );
        if (progRes.rows.length === 0) {
          console.warn(`Filière ${s.programName} introuvable pour ${s.schoolName}, espace ${s.name} ignoré.`);
          continue;
        }
        scopeProgramId = progRes.rows[0].id;
      } else if (s.scope === 'role') {
        scopeRoleCode = s.roleCode ?? null;
      }

      const res = await client.query<{ id: string }>(
        `INSERT INTO spaces (school_id, name, description, scope, scope_program_id, scope_role_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         ON CONFLICT (school_id, name) DO UPDATE
           SET scope = EXCLUDED.scope,
               scope_program_id = EXCLUDED.scope_program_id,
               scope_role_code = EXCLUDED.scope_role_code
         RETURNING id;`,
        [schoolId, s.name, s.description ?? null, s.scope, scopeProgramId, scopeRoleCode],
      );

      if (res.rows.length > 0) {
        spaceIdByName[s.name] = res.rows[0].id;
        insertedSpaces++;
      }
    }

    console.log(`Espaces : ${spacesData.length} configurés, ${insertedSpaces} traités.`);

    // 7. Membres explicites (space_members)
    // Ajouter l'invité seed (Sophie Moukengue) à l'espace Parents / invités
    const guestUserRes = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      ['sophie.moukengue@example.com'],
    );
    const parentsSpaceId = spaceIdByName['Parents / invités'];

    if (guestUserRes.rows.length > 0 && parentsSpaceId) {
      const guestUserId = guestUserRes.rows[0].id;
      await client.query(
        `INSERT INTO space_members (space_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (space_id, user_id) DO NOTHING;`,
        [parentsSpaceId, guestUserId],
      );
      console.log(`Membre de test : Sophie Moukengue ajoutée à l'espace 'Parents / invités'.`);
    }

    console.log('Seed terminé avec succès !');
    await client.end();
    process.exit(0);
  } catch (error) {
    let rawMessage = '';
    if (error instanceof Error) {
      rawMessage = error.message || (error as { code?: string }).code || error.name;
    } else {
      rawMessage = String(error);
    }
    const safeMessage = rawMessage.replace(/postgres(ql)?:\/\/[^\s]+/gi, '<DATABASE_URL>');
    console.error(`Échec du seed : ${safeMessage}`);
    try {
      await client.end();
    } catch {
      // Ignorer
    }
    process.exit(1);
  }
}

await seed();
