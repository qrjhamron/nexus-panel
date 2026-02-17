import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DatabasesService } from './databases.service';
import { ServersService } from '../servers/servers.service';
import { CreateDatabaseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('databases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers/:uuid/databases')
export class DatabasesController {
  constructor(
    private readonly databasesService: DatabasesService,
    private readonly serversService: ServersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List databases for a server' })
  async findByServer(
    @Param('uuid') uuid: string,
    @CurrentUser() user: AuthUser,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin);
    return this.databasesService.findByServer(server.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a database for a server' })
  async create(
    @Param('uuid') uuid: string,
    @Body() dto: CreateDatabaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin);
    return this.databasesService.create(server.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a database' })
  async delete(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin);
    return this.databasesService.delete(id);
  }
}
