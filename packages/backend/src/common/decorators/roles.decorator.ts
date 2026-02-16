import { SetMetadata } from '@nestjs/common';

export const Roles = (..._roles: string[]) => SetMetadata('roles', true);
