import { Injectable, Logger } from '@nestjs/common';
import { NodeEntity } from '../database/entities/node.entity';
import {
  PowerAction,
  WingsServerConfig,
} from '@nexus/shared';

@Injectable()
export class WingsService {
  private readonly logger = new Logger(WingsService.name);

  private buildUrl(node: NodeEntity, path: string): string {
    return `${node.scheme}://${node.fqdn}:${node.daemonPort}/api${path}`;
  }

  private buildHeaders(node: NodeEntity): Record<string, string> {
    return {
      Authorization: `Bearer ${node.daemonToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request<T>(
    node: NodeEntity,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = this.buildUrl(node, path);
    const headers = this.buildHeaders(node);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Wings API error ${response.status}: ${text}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (error) {
      this.logger.error(`Wings request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  async createServer(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
    installScript?: string,
    installImage?: string,
  ): Promise<void> {
    await this.request(node, 'POST', '/servers', {
      server: serverConfig,
      installScript,
      installDockerImage: installImage,
    });
  }

  async deleteServer(node: NodeEntity, serverUuid: string): Promise<void> {
    await this.request(node, 'DELETE', `/servers/${serverUuid}`);
  }

  async powerAction(
    node: NodeEntity,
    serverUuid: string,
    action: PowerAction,
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/power`, { action });
  }

  async sendCommand(
    node: NodeEntity,
    serverUuid: string,
    command: string,
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/command`, {
      command,
    });
  }

  async updateResources(
    node: NodeEntity,
    serverUuid: string,
    resources: { memoryLimit: number; cpuLimit: number; diskLimit: number },
  ): Promise<void> {
    await this.request(
      node,
      'PATCH',
      `/servers/${serverUuid}/resources`,
      resources,
    );
  }

  async listFiles(
    node: NodeEntity,
    serverUuid: string,
    path: string,
  ): Promise<any> {
    return this.request(
      node,
      'GET',
      `/servers/${serverUuid}/files?path=${encodeURIComponent(path)}`,
    );
  }

  async readFile(
    node: NodeEntity,
    serverUuid: string,
    path: string,
  ): Promise<any> {
    return this.request(
      node,
      'GET',
      `/servers/${serverUuid}/files/read?path=${encodeURIComponent(path)}`,
    );
  }

  async writeFile(
    node: NodeEntity,
    serverUuid: string,
    path: string,
    content: string,
  ): Promise<void> {
    await this.request(
      node,
      'POST',
      `/servers/${serverUuid}/files/write?path=${encodeURIComponent(path)}`,
      { content },
    );
  }

  async deleteFiles(
    node: NodeEntity,
    serverUuid: string,
    paths: string[],
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/files/delete`, {
      paths,
    });
  }

  async compressFiles(
    node: NodeEntity,
    serverUuid: string,
    paths: string[],
    destination: string,
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/files/compress`, {
      paths,
      destination,
    });
  }

  async decompressFile(
    node: NodeEntity,
    serverUuid: string,
    path: string,
    destination: string,
  ): Promise<void> {
    await this.request(
      node,
      'POST',
      `/servers/${serverUuid}/files/decompress`,
      { path, destination },
    );
  }

  async createDirectory(
    node: NodeEntity,
    serverUuid: string,
    path: string,
  ): Promise<void> {
    await this.request(
      node,
      'POST',
      `/servers/${serverUuid}/files/directory`,
      { path },
    );
  }

  async renameFile(
    node: NodeEntity,
    serverUuid: string,
    path: string,
    newName: string,
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/files/rename`, {
      path,
      newName,
    });
  }

  async installServer(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
    installScript: string,
    installImage: string,
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverConfig.uuid}/install`, {
      server: serverConfig,
      installScript,
      installDockerImage: installImage,
    });
  }

  async getServerStatus(node: NodeEntity, serverUuid: string): Promise<any> {
    return this.request(node, 'GET', `/servers/${serverUuid}/status`);
  }

  async suspendServer(node: NodeEntity, serverUuid: string): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/suspend`);
  }

  async unsuspendServer(node: NodeEntity, serverUuid: string): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverUuid}/unsuspend`);
  }

  async reinstallServer(
    node: NodeEntity,
    serverConfig: WingsServerConfig,
    installScript: string,
    installImage: string,
  ): Promise<void> {
    await this.request(node, 'POST', `/servers/${serverConfig.uuid}/reinstall`, {
      server: serverConfig,
      installScript,
      installDockerImage: installImage,
    });
  }
}
