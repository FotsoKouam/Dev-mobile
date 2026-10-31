import { NestFactory, Reflector } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { PermissionsGuard } from './auth/permissions.guard.js';

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

  // Validation des variables d'environnement obligatoires via ConfigService
  const configService = app.get(ConfigService);
  const googleClientId = configService.get<string>('GOOGLE_CLIENT_ID');
  if (!googleClientId || googleClientId.trim() === '') {
    console.error('GOOGLE_CLIENT_ID est manquante ou vide : voir backend/.env.example');
    process.exit(1);
  }

  const jwtAccessSecret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!jwtAccessSecret || jwtAccessSecret.trim() === '') {
    console.error('JWT_ACCESS_SECRET est manquante ou vide : voir backend/.env.example');
    process.exit(1);
  }

  const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!jwtRefreshSecret || jwtRefreshSecret.trim() === '') {
    console.error('JWT_REFRESH_SECRET est manquante ou vide : voir backend/.env.example');
    process.exit(1);
  }

  if (jwtAccessSecret === jwtRefreshSecret) {
    console.error('JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être différents');
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

  // Gardes globales : JwtAuthGuard + PermissionsGuard
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new PermissionsGuard(reflector));

  // Vérifier et afficher la connexion à la base de données
  const dataSource = app.get(DataSource, { strict: false });
  if (dataSource?.isInitialized) {
    console.log('Base de données connectée');
  }

  // Swagger sur /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RAG Platform API')
    .setDescription('Documentation de l API pour le socle backend (Écoles, Filières, Utilisateurs et Authentification)')
    .setVersion('1.0')
    .addBearerAuth()
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
