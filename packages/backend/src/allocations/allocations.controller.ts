import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AllocationsService } from './allocations.service';
import { CreateAllocationsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List allocations for a node' })
  @ApiQuery({ name: 'nodeId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  async findByNode(
    @Query('nodeId') nodeId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.allocationsService.findByNode(
      nodeId,
      page ? +page : 1,
      perPage ? +perPage : 50,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create allocations (bulk port range)' })
  async create(@Body() dto: CreateAllocationsDto) {
    return this.allocationsService.create(
      dto.nodeId,
      dto.ip,
      dto.portStart,
      dto.portEnd,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an allocation' })
  async delete(@Param('id') id: string) {
    return this.allocationsService.delete(id);
  }
}
