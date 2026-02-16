import { IsNotEmpty, IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAllocationsDto {
  @ApiProperty()
  @IsUUID()
  nodeId: string;

  @ApiProperty({ example: '0.0.0.0' })
  @IsString()
  @IsNotEmpty()
  ip: string;

  @ApiProperty({ example: 25565 })
  @IsNumber()
  @Min(1024)
  portStart: number;

  @ApiProperty({ example: 25575 })
  @IsNumber()
  @Min(1024)
  portEnd: number;
}
