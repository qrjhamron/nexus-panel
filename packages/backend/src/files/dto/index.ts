import { IsNotEmpty, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WriteFileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty()
  @IsString()
  content: string;
}

export class CreateDirectoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class RenameFileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newName: string;
}

export class CompressFilesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  paths: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destination: string;
}

export class DecompressArchiveDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destination: string;
}

export class DeleteFilesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  paths: string[];
}
