import { IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDatabaseDto {
  @ApiPropertyOptional({ example: 'my_database' })
  @IsOptional()
  @IsString()
  database?: string;

  @ApiProperty()
  @IsUUID()
  databaseHostId: string;

  @ApiPropertyOptional({ example: '%' })
  @IsOptional()
  @IsString()
  remote?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  maxConnections?: number;
}
