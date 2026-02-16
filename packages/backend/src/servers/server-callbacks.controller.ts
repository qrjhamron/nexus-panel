import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { DaemonTokenGuard } from '../common/guards/daemon-token.guard';

@ApiTags('servers/callbacks')
@UseGuards(DaemonTokenGuard)
@Controller('servers')
export class ServerCallbacksController {
  constructor(private readonly serversService: ServersService) {}

  @Post(':uuid/install-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive install status callback from Wings' })
  async installStatus(
    @Param('uuid') uuid: string,
    @Body() body: { status: string; message?: string },
  ) {
    if (!body.status || !['success', 'failed'].includes(body.status)) {
      throw new BadRequestException('Invalid status: must be "success" or "failed"');
    }
    return this.serversService.updateInstallStatus(uuid, body.status, body.message);
  }
}
