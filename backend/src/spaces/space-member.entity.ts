import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { Space } from './space.entity.js';
import { User } from '../users/user.entity.js';

@Entity('space_members')
@Unique(['spaceId', 'userId'])
export class SpaceMember extends BaseEntity {
  @Column({ type: 'uuid' })
  spaceId: string;

  @ManyToOne(() => Space, (space) => space.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space: Relation<Space>;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User | null>;
}
