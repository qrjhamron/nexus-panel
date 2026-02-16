import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@nexus.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@nexus.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class TwoFactorVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class TwoFactorLoginDto {
  @ApiProperty({ description: 'Temporary session token from login response' })
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ApiProperty({ example: '123456', description: 'TOTP code or backup code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
