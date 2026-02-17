import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodeEntity } from '../database/entities/node.entity';
import { NodeHeartbeatStore } from './node-heartbeat.store';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-daemon-token'),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-daemon-token')),
  compare: jest.fn(() => Promise.resolve(true)),
}));

describe('NodesService', () => {
  let service: NodesService;
  let nodeRepo: Record<string, jest.Mock>;

  const mockNode: Partial<NodeEntity> = {
    id: 'node-1',
    name: 'Node 1',
    fqdn: 'node1.example.com',
    location: 'us-east-1',
    scheme: 'https',
    daemonPort: 8080,
    memory: 8192,
    disk: 50000,
    daemonTokenId: 'token-id',
    daemonToken: 'existing-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    nodeRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'node-1', ...entity })),
      remove: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        { provide: getRepositoryToken(NodeEntity), useValue: nodeRepo },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'http://localhost:3000') } },
        NodeHeartbeatStore,
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
  });

  describe('findAll', () => {
    it('should return paginated nodes', async () => {
      nodeRepo.findAndCount.mockResolvedValue([[mockNode], 1]);

      const result = await service.findAll(1, 25);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        perPage: 25,
        totalPages: 1,
      });
    });
  });

  describe('create', () => {
    it('should generate daemon token', async () => {
      const dto = {
        name: 'New Node',
        fqdn: 'new.example.com',
        location: 'us-east-1',
        scheme: 'https',
        memory: 4096,
        disk: 20000,
      };

      const result = await service.create(dto as any);

      expect(nodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          daemonToken: 'generated-daemon-token',
        }),
      );
      expect(result.node).toBeDefined();
      expect(result.node.daemonToken).toBe('generated-daemon-token');
      expect(result.configurationToken).toBeDefined();
      const decoded = JSON.parse(
        Buffer.from(result.configurationToken, 'base64').toString(),
      );
      expect(decoded.token).toContain('generated-daemon-token');
    });
  });

  describe('delete', () => {
    it('should delete node', async () => {
      nodeRepo.findOne.mockResolvedValue(mockNode);

      await service.delete('node-1');

      expect(nodeRepo.remove).toHaveBeenCalledWith(mockNode);
    });

    it('should throw NotFoundException if node not found', async () => {
      nodeRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
