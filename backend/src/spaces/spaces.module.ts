import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from './space.entity.js';
import { SpaceMember } from './space-member.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { User } from '../users/user.entity.js';
import { Document } from '../documents/document.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { SpacesService } from './spaces.service.js';
import { SpacesController } from './spaces.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Space,
      SpaceMember,
      School,
      Program,
      User,
      Document,
      Assignment,
    ]),
  ],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
