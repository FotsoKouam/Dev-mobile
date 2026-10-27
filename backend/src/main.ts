import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';

// Charger les variables d'environnement depuis backend/.env si présent
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// Validation au démarrage : DATABASE_URL obligatoire et non vide
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim() === '') {
  console.error('DATABASE_URL est manquante : voir backend/.env.example');
  process.exit(1);
}

async function bootstrap() {
  let app;
  try {
    app = await NestFactory.create(AppModule);
  } catch (error) {
    let raw = '';
    if (error instanceof Error) {
      raw = error.message || (error as { code?: string }).code || error.name;
    } else {
      raw = String(error);
    }
    const safe = raw.replace(/postgres(ql)?:\/\/[^\s]+/gi, '<DATABASE_URL>');
    console.error(`Échec de connexion à la base de données : ${safe}`);
    process.exit(1);
  }

  // Préfixe global api, en excluant la route racine GET /
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  // ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Vérifier et afficher la connexion à la base de données
  const dataSource = app.get(DataSource, { strict: false });
  if (dataSource?.isInitialized) {
    console.log('Base de données connectée');
  }

  // Swagger sur /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RAG Platform API')
    .setDescription('Documentation de l API pour le socle backend (Écoles et Filières)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Allow web clients (Angular) to call this backend from their origin.
  // Mobile (React Native) is not subject to CORS restrictions.
  app.enableCors({
    origin: [
      'http://localhost:4200',           // Angular dev server
      'https://rag-web-lime.vercel.app', // Angular production (Vercel)
    ],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
await bootstrap();
