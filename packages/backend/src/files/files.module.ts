import { Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [ServersModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
