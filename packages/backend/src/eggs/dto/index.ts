import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNestDto {
  @ApiProperty({ example: 'Game Servers' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Nesting group for game servers' })
  @IsString()
  description: string;
}

export class EggVariableDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  envVariable: string;

  @ApiProperty()
  @IsString()
  defaultValue: string;

  @ApiProperty()
  @IsBoolean()
  userViewable: boolean;

  @ApiProperty()
  @IsBoolean()
  userEditable: boolean;

  @ApiProperty()
  @IsString()
  rules: string;
}

export class CreateEggDto {
  @ApiProperty()
  @IsUUID()
  nestId: string;

  @ApiProperty({ example: 'Minecraft Paper' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ example: 'ghcr.io/pterodactyl/yolks:java_17' })
  @IsString()
  @IsNotEmpty()
  dockerImage: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dockerImages?: Record<string, string>;

  @ApiProperty({ example: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar' })
  @IsString()
  @IsNotEmpty()
  startup: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configFiles?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configStartup?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  configStop?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configLogs?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptInstall?: string;

  @ApiPropertyOptional({ example: 'bash' })
  @IsOptional()
  @IsString()
  scriptEntry?: string;

  @ApiPropertyOptional({ example: 'alpine:latest' })
  @IsOptional()
  @IsString()
  scriptContainer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  copyScriptFrom?: string;

  @ApiPropertyOptional({ type: [EggVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EggVariableDto)
  variables?: EggVariableDto[];
}

export class UpdateEggDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dockerImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dockerImages?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configFiles?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configStartup?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  configStop?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configLogs?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptInstall?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptEntry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptContainer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  copyScriptFrom?: string;

  @ApiPropertyOptional({ type: [EggVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EggVariableDto)
  variables?: EggVariableDto[];
}
