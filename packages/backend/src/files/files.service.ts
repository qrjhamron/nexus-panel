import { Injectable } from '@nestjs/common';
import { NodeEntity } from '../database/entities/node.entity';
import { WingsService } from '../wings/wings.service';

@Injectable()
export class FilesService {
  constructor(private readonly wingsService: WingsService) {}

  async listDirectory(node: NodeEntity, serverUuid: string, path: string) {
    return this.wingsService.listFiles(node, serverUuid, path);
  }

  async readFile(node: NodeEntity, serverUuid: string, path: string) {
    return this.wingsService.readFile(node, serverUuid, path);
  }

  async writeFile(
    node: NodeEntity,
    serverUuid: string,
    path: string,
    content: string,
  ) {
    return this.wingsService.writeFile(node, serverUuid, path, content);
  }

  async createDirectory(node: NodeEntity, serverUuid: string, path: string) {
    return this.wingsService.createDirectory(node, serverUuid, path);
  }

  async rename(
    node: NodeEntity,
    serverUuid: string,
    path: string,
    newName: string,
  ) {
    return this.wingsService.renameFile(node, serverUuid, path, newName);
  }

  async deleteFiles(
    node: NodeEntity,
    serverUuid: string,
    paths: string[],
  ) {
    return this.wingsService.deleteFiles(node, serverUuid, paths);
  }

  async compress(
    node: NodeEntity,
    serverUuid: string,
    paths: string[],
    destination: string,
  ) {
    return this.wingsService.compressFiles(node, serverUuid, paths, destination);
  }

  async decompress(
    node: NodeEntity,
    serverUuid: string,
    path: string,
    destination: string,
  ) {
    return this.wingsService.decompressFile(node, serverUuid, path, destination);
  }
}
