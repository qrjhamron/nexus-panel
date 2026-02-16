import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ example: 'SGP', description: 'Uppercase alphanumeric short code' })
  @IsString()
  @IsNotEmpty()
  short: string;

  @ApiProperty({ example: 'Singapore' })
  @IsString()
  @IsNotEmpty()
  long: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ example: 'SGP' })
  @IsOptional()
  @IsString()
  short?: string;

  @ApiPropertyOptional({ example: 'Singapore' })
  @IsOptional()
  @IsString()
  long?: string;
}
