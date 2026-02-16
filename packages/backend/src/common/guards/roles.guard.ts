import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresAdmin = this.reflector.getAllAndOverride<boolean>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresAdmin) return true;
    const { user } = context.switchToHttp().getRequest();
    return user.rootAdmin === true;
  }
}
