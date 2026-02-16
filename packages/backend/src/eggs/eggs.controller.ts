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

import { EggsService } from './eggs.service';
import { CreateNestDto, CreateEggDto, UpdateEggDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('eggs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EggsController {
  constructor(private readonly eggsService: EggsService) {}

  @Get('nests')
  @ApiOperation({ summary: 'List all nests' })
  async findAllNests() {
    return this.eggsService.findAllNests();
  }

  @Post('nests')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a nest (admin)' })
  async createNest(@Body() dto: CreateNestDto) {
    return this.eggsService.createNest(dto);
  }

  @Get('eggs')
  @ApiOperation({ summary: 'List eggs' })
  @ApiQuery({ name: 'nestId', required: false })
  async findAllEggs(@Query('nestId') nestId?: string) {
    return this.eggsService.findAllEggs(nestId);
  }

  @Get('eggs/:id')
  @ApiOperation({ summary: 'Get egg by ID' })
  async findEggById(@Param('id') id: string) {
    return this.eggsService.findEggById(id);
  }

  @Post('eggs')
  @Roles('admin')
  @ApiOperation({ summary: 'Create an egg (admin)' })
  async createEgg(@Body() dto: CreateEggDto) {
    return this.eggsService.createEgg(dto);
  }

  @Put('eggs/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update an egg (admin)' })
  async updateEgg(@Param('id') id: string, @Body() dto: UpdateEggDto) {
    return this.eggsService.updateEgg(id, dto);
  }

  @Delete('eggs/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an egg (admin)' })
  async deleteEgg(@Param('id') id: string) {
    return this.eggsService.deleteEgg(id);
  }

  @Post('eggs/import')
  @Roles('admin')
  @ApiOperation({ summary: 'Import an egg from JSON (admin)' })
  async importEgg(@Body() json: Record<string, any>) {
    return this.eggsService.importEgg(json);
  }

  @Get('eggs/:id/export')
  @Roles('admin')
  @ApiOperation({ summary: 'Export an egg as JSON (admin)' })
  async exportEgg(@Param('id') id: string) {
    return this.eggsService.exportEgg(id);
  }
}
