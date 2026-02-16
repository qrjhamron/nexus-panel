import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { CreateNodeDto, UpdateNodeDto, HeartbeatDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DaemonTokenGuard } from '../common/guards/daemon-token.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('heartbeat')
  @UseGuards(DaemonTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Receive heartbeat from Wings daemon' })
  async heartbeat(@Req() req: any, @Body() dto: HeartbeatDto) {
    await this.nodesService.processHeartbeat(req.node, dto);
  }

  @Get('configuration')
  @UseGuards(DaemonTokenGuard)
  @ApiOperation({ summary: 'Get node configuration for Wings daemon' })
  getConfiguration(@Req() req: any) {
    return this.nodesService.getConfiguration(req.node);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all nodes' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('search') search?: string,
  ) {
    return this.nodesService.findAll(
      page ? +page : 1,
      perPage ? +perPage : 25,
      search,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get node by ID' })
  async findById(@Param('id') id: string) {
    return this.nodesService.findById(id);
  }

  @Get(':id/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get node health status' })
  async getHealth(@Param('id') id: string) {
    return this.nodesService.getHealth(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new node' })
  async create(@Body() dto: CreateNodeDto) {
    return this.nodesService.create(dto);
  }

  @Post(':id/regenerate-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate daemon token for a node' })
  async regenerateToken(@Param('id') id: string) {
    return this.nodesService.regenerateToken(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a node' })
  async update(@Param('id') id: string, @Body() dto: UpdateNodeDto) {
    return this.nodesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a node' })
  async delete(@Param('id') id: string) {
    return this.nodesService.delete(id);
  }
}
