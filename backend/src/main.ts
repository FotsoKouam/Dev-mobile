import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow web clients (Angular) to call this backend from their origin.
  // Mobile (React Native) is not subject to CORS restrictions.
  app.enableCors({
    origin: [
      'http://localhost:4200',           // Angular dev server
      'https://rag-web-lime.vercel.app', // Angular production (Vercel)
    ],
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
