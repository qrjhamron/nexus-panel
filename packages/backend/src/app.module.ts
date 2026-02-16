import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServersModule } from './servers/servers.module';
import { NodesModule } from './nodes/nodes.module';
import { AllocationsModule } from './allocations/allocations.module';
import { EggsModule } from './eggs/eggs.module';
import { FilesModule } from './files/files.module';
import { DatabasesModule } from './databases/databases.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SubusersModule } from './subusers/subusers.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { WingsModule } from './wings/wings.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validationSchema: Joi.object({
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('nexus'),
        DB_PASSWORD: Joi.string().default('nexus'),
        DB_DATABASE: Joi.string().default('nexus'),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        APP_URL: Joi.string().default('http://localhost:3000'),
        APP_PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        ADMIN_EMAIL: Joi.string().email().optional(),
        ADMIN_PASSWORD: Joi.string().optional(),
        ADMIN_USERNAME: Joi.string().optional(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'nexus'),
        password: config.get('DB_PASSWORD', 'nexus'),
        database: config.get('DB_DATABASE', 'nexus'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('DB_LOGGING') === 'true',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ServersModule,
    NodesModule,
    AllocationsModule,
    EggsModule,
    FilesModule,
    DatabasesModule,
    SchedulesModule,
    SubusersModule,
    ApiKeysModule,
    AuditLogModule,
    NotificationsModule,
    SearchModule,
    WingsModule,
    WebSocketModule,
    AdminModule,
    SseModule,
  ],
})
export class AppModule {}
