import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from './space.entity.js';
import { Program } from '../programs/program.entity.js';
import { SpacesService } from './spaces.service.js';
import { SpacesController } from './spaces.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Space, Program])],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}

