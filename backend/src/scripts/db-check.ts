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

try {
  await client.connect();
  const res = await client.query<{ version: string }>('SELECT version();');
  const fullVersion = res.rows[0]?.version ?? '';
  const match = fullVersion.match(/^PostgreSQL\s+[\d.]+/i);
  const version = match ? match[0] : (fullVersion.split(',')[0] || fullVersion);

  console.log(`Connexion OK : ${version}`);
  await client.end();
  process.exit(0);
} catch (error) {
  let rawMessage = '';
  if (error instanceof Error) {
    rawMessage = error.message || (error as { code?: string }).code || error.name;
  } else {
    rawMessage = String(error);
  }

  // Masquer toute URL ou identifiant sensible
  const safeMessage = rawMessage.replace(/postgres(ql)?:\/\/[^\s]+/gi, '<DATABASE_URL>');
  console.error(`Échec de connexion : ${safeMessage}`);
  try {
    await client.end();
  } catch {
    // Ignorer l'erreur de fermeture
  }
  process.exit(1);
}
