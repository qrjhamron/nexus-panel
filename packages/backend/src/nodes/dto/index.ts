import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export { HeartbeatDto } from './heartbeat.dto';

export class CreateNodeDto {
  @ApiProperty({ example: 'Node 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Primary game server node' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'us-east-1' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 'node1.example.com' })
  @IsString()
  @IsNotEmpty()
  fqdn: string;

  @ApiProperty({ example: 'https', enum: ['http', 'https'] })
  @IsString()
  @IsIn(['http', 'https'])
  scheme: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  behindProxy?: boolean;

  @ApiProperty({ example: 8192, description: 'Total memory in MB' })
  @IsNumber()
  @Min(1)
  memory: number;

  @ApiPropertyOptional({ example: 0, description: 'Memory overallocation percentage' })
  @IsOptional()
  @IsNumber()
  memoryOverallocate?: number;

  @ApiProperty({ example: 50000, description: 'Total disk in MB' })
  @IsNumber()
  @Min(1)
  disk: number;

  @ApiPropertyOptional({ example: 0, description: 'Disk overallocation percentage' })
  @IsOptional()
  @IsNumber()
  diskOverallocate?: number;

  @ApiPropertyOptional({ example: 8080 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  daemonPort?: number;

  @ApiPropertyOptional({ example: 100, description: 'Max upload size in MB' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  uploadSize?: number;
}

export class UpdateNodeDto {
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
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fqdn?: string;

  @ApiPropertyOptional({ enum: ['http', 'https'] })
  @IsOptional()
  @IsString()
  @IsIn(['http', 'https'])
  scheme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  behindProxy?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  memory?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  memoryOverallocate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  disk?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  diskOverallocate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  daemonPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  uploadSize?: number;
}
