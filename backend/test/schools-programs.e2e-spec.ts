import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../src/app.module.js';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

describe('Schools & Programs API (e2e integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('RAG Platform API')
      .setDescription('Documentation de l API pour le socle backend')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET / doit renvoyer Hello World! sans préfixe', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.text).toBe('Hello World!');
  });

  it('GET /api/health doit renvoyer status ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/docs doit servir la documentation Swagger', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(res.text).toContain('Swagger UI');
  });

  it('GET /api/schools/stats doit renvoyer les statistiques du tableau de bord', async () => {
    const res = await request(app.getHttpServer()).get('/api/schools/stats').expect(200);
    expect(res.body).toEqual({
      schools: { active: 4, total: 5 },
      programs: { active: 9, total: 10 },
      users: { active: 0, total: 0 },
      institutionalSpaces: { active: 0, total: 0 },
    });
  });

  it('GET /api/schools doit renvoyer les 5 écoles du jeu de départ', async () => {
    const res = await request(app.getHttpServer()).get('/api/schools').expect(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 5 });

    const saintJean = res.body.data.find(
      (s: { name: string }) => s.name === 'Institut Universitaire Saint Jean',
    );
    expect(saintJean).toBeDefined();
    expect(saintJean.programsCount).toBe(3);
    expect(saintJean.usersCount).toBe(0);
    expect(saintJean.spacesCount).toBe(0);
    expect(saintJean.mainLanguage).toBe('fr');
  });

  it('GET /api/schools/:schoolId/programs doit renvoyer les filières de l école', async () => {
    const schoolsRes = await request(app.getHttpServer()).get('/api/schools').expect(200);
    const saintJean = schoolsRes.body.data.find(
      (s: { name: string }) => s.name === 'Institut Universitaire Saint Jean',
    );

    const res = await request(app.getHttpServer())
      .get(`/api/schools/${saintJean.id}/programs`)
      .expect(200);

    expect(res.body.data).toHaveLength(3);
    const names = res.body.data.map((p: { name: string }) => p.name).sort();
    expect(names).toEqual(['Gestion', 'ISI', 'SRT']);
  });

  it('POST /api/schools validation : 400 si données invalides', async () => {
    await request(app.getHttpServer())
      .post('/api/schools')
      .send({ name: 'A' })
      .expect(400);
  });

  it('GET /api/schools/:id : 404 si école inexistante', async () => {
    await request(app.getHttpServer())
      .get('/api/schools/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('GET /api/schools/:id : 400 si UUID invalide', async () => {
    await request(app.getHttpServer())
      .get('/api/schools/pas-un-uuid')
      .expect(400);
  });
});
