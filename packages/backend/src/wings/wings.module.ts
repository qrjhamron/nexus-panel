import { Module, Global } from '@nestjs/common';
import { WingsService } from './wings.service';

@Global()
@Module({
  providers: [WingsService],
  exports: [WingsService],
})
export class WingsModule {}
