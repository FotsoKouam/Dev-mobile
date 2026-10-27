import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './school.entity.js';
import { Program } from '../programs/program.entity.js';
import { SchoolsService } from './schools.service.js';
import { SchoolsController } from './schools.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([School, Program])],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
