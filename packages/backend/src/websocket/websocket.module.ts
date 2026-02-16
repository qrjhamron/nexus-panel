import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NexusWebSocketGateway } from './websocket.gateway';
import { WingsModule } from '../wings/wings.module';
import { ServersModule } from '../servers/servers.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'nexus-dev-secret-change-in-production'),
      }),
    }),
    WingsModule,
    ServersModule,
  ],
  providers: [NexusWebSocketGateway],
  exports: [NexusWebSocketGateway],
})
export class WebSocketModule {}
