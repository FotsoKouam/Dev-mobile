import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from './program.entity.js';
import { School } from '../schools/school.entity.js';
import { ProgramsService } from './programs.service.js';
import { ProgramsController } from './programs.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Program, School])],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
