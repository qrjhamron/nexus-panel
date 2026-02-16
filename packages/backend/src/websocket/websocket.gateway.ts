import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import {
  ClientMessageType,
  ServerMessageType,
  PowerAction,
} from '@nexus/shared';
import { WingsService } from '../wings/wings.service';
import { ServersService } from '../servers/servers.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  serverUuid?: string;
}

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class NexusWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NexusWebSocketGateway.name);
  private readonly clientSubscriptions = new Map<
    string,
    { console: boolean; stats: boolean }
  >();
  private statsInterval: ReturnType<typeof setInterval>;
  private consoleInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly wingsService: WingsService,
    private readonly serversService: ServersService,
  ) {}

  onModuleInit() {
    this.statsInterval = setInterval(() => this.pollStats(), 3000);
    this.consoleInterval = setInterval(() => this.pollConsole(), 1000);
  }

  onModuleDestroy() {
    clearInterval(this.statsInterval);
    clearInterval(this.consoleInterval);
  }

  private async pollStats() {
    const serverUuids = this.getSubscribedServerUuids('stats');
    for (const serverUuid of serverUuids) {
      try {
        const server = await this.serversService.findByUuid(serverUuid);
        const stats = await this.wingsService.getServerStatus(server.node, serverUuid);
        this.emitStatsUpdate(serverUuid, stats);
      } catch (error: any) {
        this.logger.debug(`Stats poll failed for ${serverUuid}: ${error?.message}`);
      }
    }
  }

  private async pollConsole() {
    const serverUuids = this.getSubscribedServerUuids('console');
    for (const serverUuid of serverUuids) {
      try {
        const server = await this.serversService.findByUuid(serverUuid);
        const status = await this.wingsService.getServerStatus(server.node, serverUuid);
        if (status?.output) {
          for (const line of Array.isArray(status.output) ? status.output : [status.output]) {
            this.emitConsoleOutput(serverUuid, line);
          }
        }
      } catch (error: any) {
        this.logger.debug(`Console poll failed for ${serverUuid}: ${error?.message}`);
      }
    }
  }

  private getSubscribedServerUuids(type: 'console' | 'stats'): Set<string> {
    const uuids = new Set<string>();
    const sockets = this.server?.sockets?.sockets;
    if (!sockets) return uuids;
    for (const [, socket] of sockets) {
      const client = socket as AuthenticatedSocket;
      const subs = this.clientSubscriptions.get(client.id);
      if (client.serverUuid && subs?.[type]) {
        uuids.add(client.serverUuid);
      }
    }
    return uuids;
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.debug(`Client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, {
      console: false,
      stats: false,
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.clientSubscriptions.delete(client.id);
    if (client.serverUuid) {
      client.leave(`server:${client.serverUuid}`);
    }
  }

  @SubscribeMessage(ClientMessageType.AUTH)
  async handleAuth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string; serverUuid: string },
  ) {
    try {
      const payload = this.jwtService.verify(data.token);
      client.userId = payload.sub;
      client.serverUuid = data.serverUuid;
      client.join(`server:${data.serverUuid}`);

      client.emit('message', {
        type: ServerMessageType.AUTH_SUCCESS,
      });
    } catch {
      client.emit('message', {
        type: ServerMessageType.ERROR,
        message: 'Authentication failed',
      });
      client.disconnect();
    }
  }

  @SubscribeMessage(ClientMessageType.SUBSCRIBE_CONSOLE)
  handleSubscribeConsole(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;
    const subs = this.clientSubscriptions.get(client.id);
    if (subs) subs.console = true;
  }

  @SubscribeMessage(ClientMessageType.SUBSCRIBE_STATS)
  handleSubscribeStats(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;
    const subs = this.clientSubscriptions.get(client.id);
    if (subs) subs.stats = true;
  }

  @SubscribeMessage(ClientMessageType.SEND_COMMAND)
  async handleSendCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { command: string },
  ) {
    if (!client.userId || !client.serverUuid) return;
    try {
      const server = await this.serversService.findByUuid(client.serverUuid);
      await this.wingsService.sendCommand(server.node, server.uuid, data.command);
      client.emit('message', {
        type: ServerMessageType.CONSOLE_OUTPUT,
        line: `> ${data.command}`,
      });
    } catch (error: any) {
      this.logger.error(`Command failed for ${client.serverUuid}: ${error?.message}`);
      client.emit('message', {
        type: ServerMessageType.ERROR,
        message: `Failed to send command: ${error?.message}`,
      });
    }
  }

  @SubscribeMessage(ClientMessageType.SEND_POWER_ACTION)
  async handleSendPowerAction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { action: PowerAction },
  ) {
    if (!client.userId || !client.serverUuid) return;
    try {
      const server = await this.serversService.findByUuid(client.serverUuid);
      await this.wingsService.powerAction(server.node, server.uuid, data.action);
      client.emit('message', {
        type: ServerMessageType.POWER_STATE,
        state: data.action,
      });
    } catch (error: any) {
      this.logger.error(`Power action failed for ${client.serverUuid}: ${error?.message}`);
      client.emit('message', {
        type: ServerMessageType.ERROR,
        message: `Failed to send power action: ${error?.message}`,
      });
    }
  }

  // Methods to forward events from Wings to subscribed clients
  emitConsoleOutput(serverUuid: string, line: string) {
    this.server.to(`server:${serverUuid}`).emit('message', {
      type: ServerMessageType.CONSOLE_OUTPUT,
      line,
    });
  }

  emitStatsUpdate(serverUuid: string, stats: any) {
    this.server.to(`server:${serverUuid}`).emit('message', {
      type: ServerMessageType.STATS_UPDATE,
      stats,
    });
  }

  emitPowerState(serverUuid: string, state: string) {
    this.server.to(`server:${serverUuid}`).emit('message', {
      type: ServerMessageType.POWER_STATE,
      state,
    });
  }
}
