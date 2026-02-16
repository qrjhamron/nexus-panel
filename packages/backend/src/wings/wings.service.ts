import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { NodeEntity } from '../database/entities/node.entity';
import { PowerAction, WingsServerConfig } from '@nexus/shared';
import { EventEmitter2 } from '@nestjs/event-emitter';

// gRPC client cache per node
interface NodeGrpcClient {
  client: any;
  nodeId: string;
  address: string;
}

@Injectable()
export class WingsService implements OnModuleInit {
  private readonly logger = new Logger(WingsService.name);
  private readonly clients = new Map<string, NodeGrpcClient>();
  private wingsProto: any;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    const protoPath = path.join(__dirname, '..', '..', '..', 'shared', 'proto', 'wings.proto');
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: false,
      longs: Number,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const proto = grpc.loadPackageDefinition(packageDefinition) as any;
    this.wingsProto = proto.nexus.wings;
  }

  private getClient(node: NodeEntity): any {
    const cached = this.clients.get(node.id);
    // gRPC goes through nginx SSL (port 443) when behindProxy, else direct to grpc port
    const grpcPort = node.behindProxy ? node.daemonPort : (node.daemonPort + 1);
    const address = `${node.fqdn}:${grpcPort}`;

    if (cached && cached.address === address) {
      return cached.client;
    }

    let creds: grpc.ChannelCredentials;
    if (node.scheme === 'https') {
      creds = grpc.credentials.createSsl();
    } else {
      creds = grpc.credentials.createInsecure();
    }

    const client = new this.wingsProto.WingsService(address, creds);
    this.clients.set(node.id, { client, nodeId: node.id, address });
    this.logger.log(`gRPC client created for node ${node.name} at ${address}`);
    return client;
  }

  private buildMetadata(node: NodeEntity): grpc.Metadata {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', `Bearer ${node.daemonTokenId}.${node.daemonToken}`);
    return metadata;
  }

  private callGrpc<T>(client: any, method: string, request: any, metadata: grpc.Metadata): Promise<T> {
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 30);

      client[method](request, metadata, { deadline }, (error: any, response: T) => {
        if (error) {
          this.logger.error(`gRPC ${method} failed: ${error.message} (code: ${error.code})`);
          reject(new Error(`Wings gRPC error: ${error.message}`));
        } else {
          resolve(response);
        }
      });
    });
  }

  private mapPowerAction(action: PowerAction): number {
    switch (action) {
      case PowerAction.START: return 0;
      case PowerAction.STOP: return 1;
      case PowerAction.RESTART: return 2;
      case PowerAction.KILL: return 3;
      default: return 0;
    }
  }

  async createServer(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
    installScript?: string,
    installImage?: string,
  ): Promise<void> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'createServer', {
      server: {
        uuid: serverConfig.uuid,
        dockerImage: serverConfig.dockerImage,
        startupCommand: serverConfig.startupCommand,
        environment: serverConfig.environment,
        memoryLimitMb: serverConfig.memoryLimit,
        cpuLimit: serverConfig.cpuLimit,
        diskLimitMb: serverConfig.diskLimit,
        portMappings: serverConfig.portMappings.map(pm => ({
          hostPort: pm.hostPort,
          containerPort: pm.containerPort,
        })),
        volumePath: serverConfig.volumePath || '',
      },
      installScript: installScript || '',
      installDockerImage: installImage || '',
    }, metadata);
  }

  async deleteServer(node: NodeEntity, serverUuid: string): Promise<void> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'deleteServer', {
      uuid: serverUuid,
      removeVolumes: false,
    }, metadata);
  }

  async powerAction(
    node: NodeEntity,
    serverUuid: string,
    action: PowerAction,
  ): Promise<void> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'sendPowerAction', {
      uuid: serverUuid,
      action: this.mapPowerAction(action),
    }, metadata);
  }

  async sendCommand(
    node: NodeEntity,
    serverUuid: string,
    command: string,
  ): Promise<void> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'sendCommand', {
      uuid: serverUuid,
      command,
    }, metadata);
  }

  async updateResources(
    node: NodeEntity,
    serverUuid: string,
    resources: { memoryLimit: number; cpuLimit: number; diskLimit: number },
  ): Promise<void> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'updateResources', {
      uuid: serverUuid,
      memoryLimitMb: resources.memoryLimit,
      cpuLimit: resources.cpuLimit,
      diskLimitMb: resources.diskLimit,
    }, metadata);
  }

  async getServerStatus(node: NodeEntity, serverUuid: string): Promise<any> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    return this.callGrpc(client, 'getServerStatus', { uuid: serverUuid }, metadata);
  }

  async getSystemInfo(node: NodeEntity): Promise<any> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    return this.callGrpc(client, 'getSystemInfo', {}, metadata);
  }

  async syncServerConfig(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
  ): Promise<void> {
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'syncServerConfig', {
      server: {
        uuid: serverConfig.uuid,
        dockerImage: serverConfig.dockerImage,
        startupCommand: serverConfig.startupCommand,
        environment: serverConfig.environment,
        memoryLimitMb: serverConfig.memoryLimit,
        cpuLimit: serverConfig.cpuLimit,
        diskLimitMb: serverConfig.diskLimit,
        portMappings: serverConfig.portMappings.map(pm => ({
          hostPort: pm.hostPort,
          containerPort: pm.containerPort,
        })),
        volumePath: serverConfig.volumePath || '',
      },
    }, metadata);
  }

  async installServer(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
    installScript: string,
    installImage: string,
  ): Promise<void> {
    // Reinstall uses the same gRPC method
    const client = this.getClient(node);
    const metadata = this.buildMetadata(node);
    await this.callGrpc(client, 'reinstallServer', {
      server: {
        uuid: serverConfig.uuid,
        dockerImage: serverConfig.dockerImage,
        startupCommand: serverConfig.startupCommand,
        environment: serverConfig.environment,
        memoryLimitMb: serverConfig.memoryLimit,
        cpuLimit: serverConfig.cpuLimit,
        diskLimitMb: serverConfig.diskLimit,
        portMappings: serverConfig.portMappings.map(pm => ({
          hostPort: pm.hostPort,
          containerPort: pm.containerPort,
        })),
        volumePath: serverConfig.volumePath || '',
      },
      installScript,
      installDockerImage: installImage,
    }, metadata);
  }

  async reinstallServer(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
    installScript: string,
    installImage: string,
  ): Promise<void> {
    return this.installServer(node, serverConfig, installScript, installImage);
  }

  // These REST-only endpoints remain for browser-facing features (files, suspend)
  // They still use HTTP since these are not hot-path operations

  private buildHttpUrl(node: NodeEntity, path: string): string {
    return `${node.scheme}://${node.fqdn}:${node.daemonPort}/api${path}`;
  }

  private buildHttpHeaders(node: NodeEntity): Record<string, string> {
    return {
      Authorization: `Bearer ${node.daemonTokenId}.${node.daemonToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async httpRequest<T>(
    node: NodeEntity,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = this.buildHttpUrl(node, path);
    const headers = this.buildHttpHeaders(node);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wings HTTP error ${response.status}: ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  }

  async listFiles(node: NodeEntity, serverUuid: string, filePath: string): Promise<any> {
    return this.httpRequest(node, 'GET', `/servers/${serverUuid}/files?path=${encodeURIComponent(filePath)}`);
  }

  async readFile(node: NodeEntity, serverUuid: string, filePath: string): Promise<any> {
    return this.httpRequest(node, 'GET', `/servers/${serverUuid}/files/read?path=${encodeURIComponent(filePath)}`);
  }

  async writeFile(node: NodeEntity, serverUuid: string, filePath: string, content: string): Promise<void> {
    await this.httpRequest(node, 'POST', `/servers/${serverUuid}/files/write`, { path: filePath, content });
  }

  async deleteFiles(node: NodeEntity, serverUuid: string, paths: string[]): Promise<void> {
    await this.httpRequest(node, 'POST', `/servers/${serverUuid}/files/delete`, { paths });
  }

  async compressFiles(node: NodeEntity, serverUuid: string, paths: string[], destination: string): Promise<void> {
    await this.httpRequest(node, 'POST', `/servers/${serverUuid}/files/compress`, { paths, destination });
  }

  async decompressFile(node: NodeEntity, serverUuid: string, filePath: string, destination: string): Promise<void> {
    await this.httpRequest(node, 'POST', `/servers/${serverUuid}/files/decompress`, { path: filePath, destination });
  }

  async createDirectory(node: NodeEntity, serverUuid: string, filePath: string): Promise<void> {
    await this.httpRequest(node, 'POST', `/servers/${serverUuid}/files/directory`, { path: filePath });
  }

  async renameFile(node: NodeEntity, serverUuid: string, filePath: string, newName: string): Promise<void> {
    await this.httpRequest(node, 'POST', `/servers/${serverUuid}/files/rename`, { from: filePath, to: newName });
  }

  async suspendServer(node: NodeEntity, serverUuid: string): Promise<void> {
    // Suspend is handled by Panel only (no Wings endpoint needed)
  }

  async unsuspendServer(node: NodeEntity, serverUuid: string): Promise<void> {
    // Unsuspend is handled by Panel only
  }

  async checkAvailability(node: NodeEntity): Promise<boolean> {
    try {
      const client = this.getClient(node);
      const metadata = this.buildMetadata(node);
      await this.callGrpc(client, 'getSystemInfo', {}, metadata);
      return true;
    } catch {
      // Fallback to HTTP health check
      try {
        const url = this.buildHttpUrl(node, '/health');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);
        return response.ok;
      } catch {
        return false;
      }
    }
  }
}
