import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SchoolsModule } from './schools/schools.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { RolesModule } from './roles/roles.module.js';
import { UsersModule } from './users/users.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';

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
    SchoolsModule,
    ProgramsModule,
    RolesModule,
    UsersModule,
    AssignmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
