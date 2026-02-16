import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServerEntity, ServerStatus } from '../database/entities/server.entity';
import { SseService } from '../sse/sse.service';

// Event payload types
export interface ServerStateChangedEvent {
  uuid: string;
  previousState: string;
  newState: string;
  timestampMs: number;
}

export interface ServerInstallCompleteEvent {
  uuid: string;
  timestampMs: number;
}

export interface ServerInstallFailedEvent {
  uuid: string;
  errorMessage: string;
  timestampMs: number;
}

export interface ServerStatsEvent {
  uuid: string;
  cpuPercent: number;
  memoryBytes: number;
  memoryLimit: number;
  networkRxBytes: number;
  networkTxBytes: number;
  diskBytes: number;
  timestampMs: number;
}

export interface ConsoleOutputEvent {
  uuid: string;
  line: string;
  timestampMs: number;
}

@Injectable()
export class EventHandlers {
  private readonly logger = new Logger(EventHandlers.name);

  // In-memory server state cache (no DB writes for live state)
  private readonly serverStates = new Map<string, string>();
  private readonly serverStats = new Map<string, ServerStatsEvent>();

  constructor(
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
    private readonly sseService: SseService,
  ) {}

  @OnEvent('server.state.changed')
  async handleStateChanged(event: ServerStateChangedEvent) {
    this.serverStates.set(event.uuid, event.newState);

    // Push to SSE for frontend
    this.sseService.emit({
      type: 'server.status',
      data: {
        uuid: event.uuid,
        state: event.newState,
        previousState: event.previousState,
      },
    });

    this.logger.debug(`Server ${event.uuid} state: ${event.previousState} → ${event.newState}`);
  }

  @OnEvent('server.installed')
  async handleInstallComplete(event: ServerInstallCompleteEvent) {
    await this.serverRepo.update(
      { uuid: event.uuid },
      { installed: 1, status: null as any },
    );

    this.sseService.emit({
      type: 'server.install.complete',
      data: { uuid: event.uuid },
    });

    this.logger.log(`Server ${event.uuid} installation completed`);
  }

  @OnEvent('server.install.failed')
  async handleInstallFailed(event: ServerInstallFailedEvent) {
    await this.serverRepo.update(
      { uuid: event.uuid },
      { installed: 2, status: ServerStatus.INSTALL_FAILED },
    );

    this.sseService.emit({
      type: 'server.install.failed',
      data: { uuid: event.uuid, error: event.errorMessage },
    });

    this.logger.error(`Server ${event.uuid} installation failed: ${event.errorMessage}`);
  }

  @OnEvent('server.stats')
  handleStats(event: ServerStatsEvent) {
    // In-memory only — no database writes
    this.serverStats.set(event.uuid, event);

    // Forward to SSE for subscribed clients
    this.sseService.emit({
      type: 'server.stats',
      data: {
        uuid: event.uuid,
        cpuPercent: event.cpuPercent,
        memoryBytes: event.memoryBytes,
        memoryLimit: event.memoryLimit,
        networkRxBytes: event.networkRxBytes,
        networkTxBytes: event.networkTxBytes,
        diskBytes: event.diskBytes,
      },
    });
  }

  @OnEvent('server.console')
  handleConsole(event: ConsoleOutputEvent) {
    // Forward to SSE — no database write
    this.sseService.emit({
      type: 'server.console',
      data: {
        uuid: event.uuid,
        line: event.line,
      },
    });
  }

  // Public accessors for cached state
  getServerState(uuid: string): string | undefined {
    return this.serverStates.get(uuid);
  }

  getServerStats(uuid: string): ServerStatsEvent | undefined {
    return this.serverStats.get(uuid);
  }

  clearServerCache(uuid: string) {
    this.serverStates.delete(uuid);
    this.serverStats.delete(uuid);
  }
}
