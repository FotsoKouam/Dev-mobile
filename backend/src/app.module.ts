import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const databaseSsl = configService.get<string>('DATABASE_SSL');
        const isSsl = databaseSsl === 'true';

        return {
          type: 'postgres',
          url: databaseUrl,
          namingStrategy: new SnakeNamingStrategy(),
          synchronize: false,
          migrationsRun: false,
          ssl: isSsl ? { rejectUnauthorized: true } : false,
          autoLoadEntities: true,
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
