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
import { SubusersService } from './subusers.service';
import { ServersService } from '../servers/servers.service';
import { InviteSubuserDto, UpdateSubuserDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('subusers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers/:uuid/subusers')
export class SubusersController {
  constructor(
    private readonly subusersService: SubusersService,
    private readonly serversService: ServersService,
  ) {}

  private async getServerWithAccess(uuid: string, user: any) {
    const server = await this.serversService.findByUuid(uuid);
    this.serversService.checkAccess(server, user.id, user.rootAdmin);
    return server;
  }

  @Get()
  @ApiOperation({ summary: 'List subusers of a server' })
  async findByServer(
    @Param('uuid') uuid: string,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    return this.subusersService.findByServer(server.id);
  }

  @Post()
  @ApiOperation({ summary: 'Invite a subuser' })
  async invite(
    @Param('uuid') uuid: string,
    @Body() dto: InviteSubuserDto,
    @CurrentUser() user: any,
  ) {
    const server = await this.getServerWithAccess(uuid, user);
    return this.subusersService.invite(
      server.id,
      dto.email,
      dto.permissions,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subuser permissions' })
  async update(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubuserDto,
    @CurrentUser() user: any,
  ) {
    await this.getServerWithAccess(uuid, user);
    return this.subusersService.update(id, dto.permissions);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a subuser' })
  async remove(
    @Param('uuid') uuid: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.getServerWithAccess(uuid, user);
    return this.subusersService.remove(id);
  }
}
