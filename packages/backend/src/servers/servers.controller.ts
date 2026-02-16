import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { ServersService } from './servers.service';
import {
  CreateServerDto,
  UpdateServerDto,
  PowerActionDto,
  ConsoleCommandDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get()
  @ApiOperation({ summary: 'List servers (user sees own, admin sees all)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('search') search?: string,
  ) {
    const isAdmin = user.rootAdmin === true;
    return this.serversService.findAll(
      page ? +page : 1,
      perPage ? +perPage : 25,
      user.id,
      isAdmin,
      search,
    );
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get server by UUID' })
  async findByUuid(
    @Param('uuid') uuid: string,
    @CurrentUser() user: any,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin === true);
    return server;
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a server (admin)' })
  async create(@Body() dto: CreateServerDto) {
    return this.serversService.create(dto);
  }

  @Put(':uuid')
  @ApiOperation({ summary: 'Update a server' })
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateServerDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin === true);
    return this.serversService.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a server (admin)' })
  async delete(@Param('uuid') uuid: string) {
    return this.serversService.delete(uuid);
  }

  @Post(':uuid/power')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send power action to server' })
  async power(
    @Param('uuid') uuid: string,
    @Body() dto: PowerActionDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin === true);
    await this.serversService.power(uuid, dto.action);
    return { message: `Power action '${dto.action}' sent` };
  }

  @Post(':uuid/command')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send console command to server' })
  async sendCommand(
    @Param('uuid') uuid: string,
    @Body() dto: ConsoleCommandDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin === true);
    await this.serversService.sendCommand(uuid, dto.command);
    return { message: 'Command sent' };
  }

  @Post(':uuid/suspend')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a server (admin)' })
  async suspend(@Param('uuid') uuid: string) {
    const server = await this.serversService.findByUuid(uuid);
    return this.serversService.suspend(server.id);
  }

  @Post(':uuid/unsuspend')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsuspend a server (admin)' })
  async unsuspend(@Param('uuid') uuid: string) {
    const server = await this.serversService.findByUuid(uuid);
    return this.serversService.unsuspend(server.id);
  }

  @Post(':uuid/reinstall')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reinstall a server (admin)' })
  async reinstall(@Param('uuid') uuid: string) {
    const server = await this.serversService.findByUuid(uuid);
    return this.serversService.reinstall(server.id);
  }

}
