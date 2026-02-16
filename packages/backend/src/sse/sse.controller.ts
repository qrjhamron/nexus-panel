import { Controller, Req, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @UseGuards(JwtAuthGuard)
  @Sse()
  sse(@Req() req: Request): Observable<MessageEvent> {
    const user = req.user as { id: string; rootAdmin: boolean };
    const { id: connectionId, observable } = this.sseService.addConnection(
      user.id,
      user.rootAdmin,
    );

    req.on('close', () => {
      this.sseService.removeConnection(connectionId);
    });

    return observable;
  }
}
