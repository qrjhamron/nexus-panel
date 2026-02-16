import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleTaskActionEnum } from '../../database/entities/schedule-task.entity';

export class ScheduleTaskDto {
  @ApiProperty()
  @IsNumber()
  sequence: number;

  @ApiProperty({ enum: ScheduleTaskActionEnum })
  @IsEnum(ScheduleTaskActionEnum)
  action: ScheduleTaskActionEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payload: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  timeOffset?: number;
}

export class CreateScheduleDto {
  @ApiProperty({ example: 'Daily Restart' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '*' })
  @IsString()
  @IsNotEmpty()
  cronMinute: string;

  @ApiProperty({ example: '4' })
  @IsString()
  @IsNotEmpty()
  cronHour: string;

  @ApiProperty({ example: '*' })
  @IsString()
  @IsNotEmpty()
  cronDayOfMonth: string;

  @ApiProperty({ example: '*' })
  @IsString()
  @IsNotEmpty()
  cronMonth: string;

  @ApiProperty({ example: '*' })
  @IsString()
  @IsNotEmpty()
  cronDayOfWeek: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ type: [ScheduleTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTaskDto)
  tasks: ScheduleTaskDto[];
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronMinute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronHour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronDayOfMonth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronMonth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronDayOfWeek?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ScheduleTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTaskDto)
  tasks?: ScheduleTaskDto[];
}
