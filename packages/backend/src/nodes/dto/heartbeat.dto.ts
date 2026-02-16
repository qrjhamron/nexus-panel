import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ServerHeartbeatDto {
  @ApiProperty()
  @IsString()
  uuid: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  resources?: Record<string, unknown>;
}

export class HeartbeatDto {
  @ApiProperty()
  @IsString()
  version: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalMemory: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  usedMemory: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalDisk: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  usedDisk: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuPercent: number;

  @ApiProperty({ type: [ServerHeartbeatDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServerHeartbeatDto)
  servers: ServerHeartbeatDto[];
}
