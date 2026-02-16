import { IsEmail, IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubuserPermission } from '@nexus/shared';

export class InviteSubuserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: SubuserPermission, isArray: true })
  @IsArray()
  @IsEnum(SubuserPermission, { each: true })
  @IsNotEmpty()
  permissions: SubuserPermission[];
}

export class UpdateSubuserDto {
  @ApiProperty({ enum: SubuserPermission, isArray: true })
  @IsArray()
  @IsEnum(SubuserPermission, { each: true })
  permissions: SubuserPermission[];
}
