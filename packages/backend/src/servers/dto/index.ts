import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PowerAction } from '@nexus/shared';

export class CreateServerDto {
  @ApiProperty({ example: 'My Server' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  nodeId: string;

  @ApiProperty()
  @IsUUID()
  eggId: string;

  @ApiProperty()
  @IsUUID()
  allocationId: string;

  @ApiProperty({ example: 1024 })
  @IsNumber()
  @Min(64)
  memory: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  cpu: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(256)
  disk: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  envVariables?: Record<string, string>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nestId: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  swap?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  io?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  threads?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  oomDisabled?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startup: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  image: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateServerDto {
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
  @IsNumber()
  @Min(64)
  memory?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  cpu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(256)
  disk?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  envVariables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  swap?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  io?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  threads?: string;

  @ApiPropertyOptional()
  @IsOptional()
  oomDisabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class PowerActionDto {
  @ApiProperty({ enum: PowerAction })
  @IsEnum(PowerAction)
  action: PowerAction;
}

export class ConsoleCommandDto {
  @ApiProperty({ example: 'say Hello World' })
  @IsString()
  @IsNotEmpty()
  command: string;
}
