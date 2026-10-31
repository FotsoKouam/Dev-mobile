import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity.js';
import { User } from '../users/user.entity.js';
import { Role } from '../roles/role.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentsController } from './assignments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, User, Role, School, Program])],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
