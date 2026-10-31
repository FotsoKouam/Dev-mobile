import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/user.entity.js';

export interface AuthenticatedUser extends User {
  sessionId?: string;
  permissions?: string[];
  schoolId?: string | null;
  isPlatformAdmin?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
