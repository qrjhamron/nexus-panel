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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AllocationEntity } from '../database/entities/allocation.entity';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateNodeAllocationsDto {
  @ApiProperty({ example: '0.0.0.0' })
  @IsString()
  @IsNotEmpty()
  ip: string;

  @ApiProperty({ example: 25565 })
  @IsNumber()
  @Min(1024)
  portStart: number;

  @ApiProperty({ example: 25575 })
  @IsNumber()
  @Min(1024)
  portEnd: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAlias?: string;
}

@ApiTags('admin/nodes/allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/nodes/:nodeId/allocations')
export class AdminAllocationsController {
  constructor(
    @InjectRepository(AllocationEntity)
    private readonly allocationRepo: Repository<AllocationEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List allocations for a node' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  async findByNode(
    @Param('nodeId') nodeId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    const p = page ? +page : 1;
    const pp = perPage ? +perPage : 50;

    const [data, total] = await this.allocationRepo.findAndCount({
      where: { nodeId },
      order: { port: 'ASC' },
      skip: (p - 1) * pp,
      take: pp,
    });

    return {
      data,
      meta: { total, page: p, perPage: pp, totalPages: Math.ceil(total / pp) },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create allocations (supports port range like 25565-25575)' })
  async create(
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateNodeAllocationsDto,
  ) {
    if (dto.portStart > dto.portEnd) {
      throw new BadRequestException('portStart must be <= portEnd');
    }
    if (dto.portEnd - dto.portStart > 1000) {
      throw new BadRequestException('Cannot create more than 1000 allocations at once');
    }

    const allocations: AllocationEntity[] = [];
    for (let port = dto.portStart; port <= dto.portEnd; port++) {
      const exists = await this.allocationRepo.findOne({
        where: { nodeId, ip: dto.ip, port },
      });
      if (!exists) {
        allocations.push(
          this.allocationRepo.create({
            nodeId,
            ip: dto.ip,
            port,
            ipAlias: dto.ipAlias,
          }),
        );
      }
    }

    return this.allocationRepo.save(allocations);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an unassigned allocation' })
  async delete(
    @Param('nodeId') nodeId: string,
    @Param('id') id: string,
  ) {
    const allocation = await this.allocationRepo.findOne({
      where: { id, nodeId },
    });
    if (!allocation) {
      throw new BadRequestException('Allocation not found');
    }
    if (allocation.serverId) {
      throw new BadRequestException('Cannot delete an assigned allocation');
    }
    await this.allocationRepo.remove(allocation);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all unassigned allocations for a node' })
  async bulkDelete(@Param('nodeId') nodeId: string) {
    await this.allocationRepo.delete({
      nodeId,
      serverId: IsNull() as any,
    });
  }
}
