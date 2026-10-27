import pg from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

async function seed() {
  try {
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

    console.log(`Seed terminé avec succès : ${insertedSchools} écoles, ${insertedPrograms} filières.`);
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
