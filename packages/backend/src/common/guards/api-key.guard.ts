import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.slice(7);
    if (!token.startsWith('ptlc_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyStart = token.substring(0, 16);
    const apiKey = await this.apiKeysService.findByKeyStart(keyStart);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const isValid = await bcrypt.compare(token, apiKey.token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.user = apiKey.user;
    this.apiKeysService.updateLastUsed(apiKey.id);

    return true;
  }
}
