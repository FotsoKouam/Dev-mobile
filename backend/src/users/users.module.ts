import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { Role } from '../roles/role.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Assignment, Role]),
    AssignmentsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
