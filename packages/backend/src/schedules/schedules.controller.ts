import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { ServersService } from '../servers/servers.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers/:uuid/schedules')
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly serversService: ServersService,
  ) {}

  private async getServerWithAccess(uuid: string, user: any) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin);
    return server;
  }

  @Get()
  @ApiOperation({ summary: 'List schedules for a server' })
  async findByServer(
    @Param('uuid') uuid: string,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    return this.schedulesService.findByServer(server.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  async findById(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.getServerWithAccess(uuid, user);
    return this.schedulesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a schedule' })
  async create(
    @Param('uuid') uuid: string,
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    return this.schedulesService.create(server.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a schedule' })
  async update(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: any,
  ) {
    await this.getServerWithAccess(uuid, user);
    return this.schedulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule' })
  async delete(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.getServerWithAccess(uuid, user);
    return this.schedulesService.delete(id);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a schedule now' })
  async execute(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.getServerWithAccess(uuid, user);
    return this.schedulesService.executeSchedule(id);
  }
}
