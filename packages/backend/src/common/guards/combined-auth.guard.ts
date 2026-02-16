import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token.startsWith('ptlc_')) {
        return this.apiKeyGuard.canActivate(context);
      }
    }

    // Default to JWT authentication
    try {
      return await (this.jwtAuthGuard.canActivate(context) as Promise<boolean>);
    } catch {
      throw (await this.apiKeyGuard.canActivate(context)) || undefined;
    }
  }
}
