import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('audit-log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'event', required: false })
  @ApiQuery({ name: 'userId', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('event') event?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditLogService.findAll(
      page ? +page : 1,
      perPage ? +perPage : 25,
      event,
      userId,
    );
  }
}
