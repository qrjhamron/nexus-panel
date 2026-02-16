import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServerEntity } from '../database/entities/server.entity';
import { AllocationEntity } from '../database/entities/allocation.entity';
import { EggEntity } from '../database/entities/egg.entity';
import { EggVariableEntity } from '../database/entities/egg-variable.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WingsService } from '../wings/wings.service';
import { NodeHeartbeatStore } from '../nodes/node-heartbeat.store';

describe('ServersService', () => {
  let service: ServersService;
  let serverRepo: Record<string, jest.Mock>;
  let allocationRepo: Record<string, jest.Mock>;
  let eggRepo: Record<string, jest.Mock>;
  let eggVariableRepo: Record<string, jest.Mock>;
  let nodeRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let wingsService: Record<string, jest.Mock>;

  const mockServer: Partial<ServerEntity> = {
    id: 'server-1',
    uuid: 'srv-uuid-1',
    name: 'Test Server',
    userId: 'user-1',
    nodeId: 'node-1',
    eggId: 'egg-1',
    allocationId: 'alloc-1',
    memory: 1024,
    cpu: 100,
    disk: 5000,
    envVariables: {},
    startup: './start.sh',
    image: 'alpine:latest',
    nestId: 'nest-1',
    node: {
      id: 'node-1',
      fqdn: 'node1.example.com',
      daemonPort: 8080,
      scheme: 'http',
      daemonToken: 'token',
    } as any,
    egg: {
      id: 'egg-1',
      dockerImage: 'alpine:latest',
      startupCommand: './start.sh',
      scriptInstall: '#!/bin/bash',
      scriptContainer: 'alpine:latest',
    } as any,
    allocation: {
      id: 'alloc-1',
      port: 25565,
    } as any,
    user: { id: 'user-1' } as any,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockServer], 1]),
  };

  beforeEach(async () => {
    serverRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'server-1', uuid: 'srv-uuid-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'server-1', uuid: 'srv-uuid-1', ...entity })),
      remove: jest.fn(() => Promise.resolve()),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    allocationRepo = {
      update: jest.fn(() => Promise.resolve()),
    };
    eggRepo = {
      findOne: jest.fn(),
    };
    eggVariableRepo = {
      find: jest.fn(() => Promise.resolve([])),
    };
    nodeRepo = {
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    wingsService = {
      createServer: jest.fn(() => Promise.resolve()),
      deleteServer: jest.fn(() => Promise.resolve()),
      powerAction: jest.fn(() => Promise.resolve()),
      sendCommand: jest.fn(() => Promise.resolve()),
      getServerStatus: jest.fn(() => Promise.resolve({ state: 'running' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServersService,
        { provide: getRepositoryToken(ServerEntity), useValue: serverRepo },
        { provide: getRepositoryToken(AllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(EggEntity), useValue: eggRepo },
        { provide: getRepositoryToken(EggVariableEntity), useValue: eggVariableRepo },
        { provide: getRepositoryToken(NodeEntity), useValue: nodeRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: WingsService, useValue: wingsService },
        { provide: NodeHeartbeatStore, useValue: { isOnline: jest.fn(() => true), getStatus: jest.fn() } },
      ],
    }).compile();

    service = module.get<ServersService>(ServersService);
  });

  describe('findAll', () => {
    it('should return paginated servers for user', async () => {
      const result = await service.findAll(1, 25, 'user-1', false);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'server.userId = :userId',
        { userId: 'user-1' },
      );
    });

    it('should return all servers for admin', async () => {
      mockQueryBuilder.where.mockClear();
      const result = await service.findAll(1, 25, 'admin-1', true);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe('findByUuid', () => {
    it('should return server with relations', async () => {
      serverRepo.findOne.mockResolvedValue(mockServer);

      const result = await service.findByUuid('srv-uuid-1');

      expect(result).toEqual(mockServer);
      expect(serverRepo.findOne).toHaveBeenCalledWith({
        where: { uuid: 'srv-uuid-1' },
        relations: ['node', 'egg', 'allocation', 'user'],
      });
    });

    it('should throw NotFoundException', async () => {
      serverRepo.findOne.mockResolvedValue(null);

      await expect(service.findByUuid('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create server, assign allocation, and call Wings', async () => {
      const mockNode = {
        id: 'node-1',
        fqdn: 'node1.example.com',
        daemonPort: 8080,
        scheme: 'http',
        daemonToken: 'token',
        memory: 8192,
        disk: 50000,
        memoryOverallocate: 0,
        diskOverallocate: 0,
      };
      const mockEgg = {
        id: 'egg-1',
        dockerImage: 'alpine:latest',
        startup: './start.sh',
        scriptInstall: '#!/bin/bash',
        scriptContainer: 'alpine:latest',
      };
      const mockAllocation = { id: 'alloc-1', port: 25565, nodeId: 'node-1', serverId: null };
      const mockUser = { id: 'user-1' };

      nodeRepo.findOne.mockResolvedValue(mockNode);
      eggRepo.findOne.mockResolvedValue(mockEgg);
      (allocationRepo as any).findOne = jest.fn().mockResolvedValue(mockAllocation);
      userRepo.findOne.mockResolvedValue(mockUser);
      (serverRepo as any).find = jest.fn().mockResolvedValue([]);
      eggVariableRepo.find.mockResolvedValue([]);
      serverRepo.findOne.mockResolvedValue(mockServer);

      const dto = {
        name: 'Test Server',
        userId: 'user-1',
        nodeId: 'node-1',
        eggId: 'egg-1',
        allocationId: 'alloc-1',
        nestId: 'nest-1',
        memory: 1024,
        cpu: 100,
        disk: 5000,
        startup: './start.sh',
        image: 'alpine:latest',
      };

      const result = await service.create(dto as any);

      expect(serverRepo.save).toHaveBeenCalled();
      expect(wingsService.createServer).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete server, unassign allocation, and call Wings', async () => {
      serverRepo.findOne.mockResolvedValue(mockServer);

      await service.delete('srv-uuid-1');

      expect(wingsService.deleteServer).toHaveBeenCalledWith(
        mockServer.node,
        'srv-uuid-1',
      );
      expect(allocationRepo.update).toHaveBeenCalledWith('alloc-1', {
        serverId: undefined,
      });
      expect(serverRepo.remove).toHaveBeenCalledWith(mockServer);
    });
  });

  describe('power', () => {
    it('should send power action to Wings', async () => {
      serverRepo.findOne.mockResolvedValue(mockServer);

      await service.power('srv-uuid-1', 'start' as any);

      expect(wingsService.powerAction).toHaveBeenCalledWith(
        mockServer.node,
        'srv-uuid-1',
        'start',
      );
    });
  });
});
