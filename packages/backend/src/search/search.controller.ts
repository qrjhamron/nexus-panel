import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across resources' })
  @ApiQuery({ name: 'q', required: true })
  async search(
    @Query('q') query: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.rootAdmin;
    return this.searchService.globalSearch(query, user.id, isAdmin);
  }
}
