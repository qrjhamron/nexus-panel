import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { ServersService } from '../servers/servers.service';
import {
  WriteFileDto,
  CreateDirectoryDto,
  RenameFileDto,
  CompressFilesDto,
  DecompressArchiveDto,
  DeleteFilesDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers/:uuid/files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly serversService: ServersService,
  ) {}

  private async getServerWithAccess(uuid: string, user: any) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin);
    return server;
  }

  @Get()
  @ApiOperation({ summary: 'List files in directory' })
  @ApiQuery({ name: 'path', required: false })
  async listDirectory(
    @Param('uuid') uuid: string,
    @Query('path') path: string = '/',
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    return this.filesService.listDirectory(server.node, server.uuid, path);
  }

  @Get('read')
  @ApiOperation({ summary: 'Read file contents' })
  @ApiQuery({ name: 'path', required: true })
  async readFile(
    @Param('uuid') uuid: string,
    @Query('path') path: string,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    return this.filesService.readFile(server.node, server.uuid, path);
  }

  @Post('write')
  @ApiOperation({ summary: 'Write file contents' })
  async writeFile(
    @Param('uuid') uuid: string,
    @Body() dto: WriteFileDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    await this.filesService.writeFile(
      server.node,
      server.uuid,
      dto.path,
      dto.content,
    );
    return { message: 'File written successfully' };
  }

  @Post('directory')
  @ApiOperation({ summary: 'Create a directory' })
  async createDirectory(
    @Param('uuid') uuid: string,
    @Body() dto: CreateDirectoryDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    await this.filesService.createDirectory(
      server.node,
      server.uuid,
      `${dto.path}/${dto.name}`,
    );
    return { message: 'Directory created successfully' };
  }

  @Post('rename')
  @ApiOperation({ summary: 'Rename a file or directory' })
  async rename(
    @Param('uuid') uuid: string,
    @Body() dto: RenameFileDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    await this.filesService.rename(
      server.node,
      server.uuid,
      dto.path,
      dto.newName,
    );
    return { message: 'File renamed successfully' };
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete files' })
  async deleteFiles(
    @Param('uuid') uuid: string,
    @Body() dto: DeleteFilesDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    await this.filesService.deleteFiles(server.node, server.uuid, dto.paths);
    return { message: 'Files deleted successfully' };
  }

  @Post('compress')
  @ApiOperation({ summary: 'Compress files' })
  async compress(
    @Param('uuid') uuid: string,
    @Body() dto: CompressFilesDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    await this.filesService.compress(
      server.node,
      server.uuid,
      dto.paths,
      dto.destination,
    );
    return { message: 'Files compressed successfully' };
  }

  @Post('decompress')
  @ApiOperation({ summary: 'Decompress an archive' })
  async decompress(
    @Param('uuid') uuid: string,
    @Body() dto: DecompressArchiveDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    await this.filesService.decompress(
      server.node,
      server.uuid,
      dto.path,
      dto.destination,
    );
    return { message: 'Archive decompressed successfully' };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('uuid') uuid: string,
    @Query('path') path: string = '/',
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    const content = file.buffer.toString('utf-8');
    await this.filesService.writeFile(
      server.node,
      server.uuid,
      `${path}/${file.originalname}`,
      content,
    );
    return { message: 'File uploaded successfully' };
  }
}
