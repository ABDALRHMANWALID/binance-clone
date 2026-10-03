// import { Observable } from 'rxjs';

// @Injectable()
// export class JwtGuardGuard implements CanActivate {
//   canActivate(
//     context: ExecutionContext,
//   ): boolean | Promise<boolean> | Observable<boolean> {
//     return true;
//   }
// }


import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUser } from '../current-user/current-user.decorator.js';
import { isUUID } from 'class-validator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) { }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (!payload.sub || !isUUID(payload.sub)) throw new UnauthorizedException();
      req.user = { id: payload.sub }; // ← ده اللي @CurrentUser() بيقراه
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  /** Authorization: Bearer <token> */
  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
