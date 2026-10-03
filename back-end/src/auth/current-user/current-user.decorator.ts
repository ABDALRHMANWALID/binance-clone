import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';

// export const CurrentUser = Reflector.createDecorator<string[]>();
export interface AuthUser {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (key: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    return key ? user?.[key] : user;
  },
);