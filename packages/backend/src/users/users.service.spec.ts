import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from '../database/entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Record<string, jest.Mock>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed-password',
    rootAdmin: false,
    usesTotp: false,
    totpSecret: undefined,
    backupCodes: undefined,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve({
          id: 'user-1',
          ...entity,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      remove: jest.fn(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: 'u1', email: 'a@b.com', username: 'user1' },
        { id: 'u2', email: 'c@d.com', username: 'user2' },
      ];
      userRepo.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll(1, 25);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        perPage: 25,
        totalPages: 1,
      });
    });
  });

  describe('findById', () => {
    it('should return user', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('should throw NotFoundException', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-pw');

      const result = await service.create({
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
      } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-new-pw' }),
      );
      expect((result as any).password).toBeUndefined();
    });

    it('should throw ConflictException for duplicate email', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          username: 'other',
          password: 'password123',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should partial update user', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockUser }) // find the user
        .mockResolvedValueOnce(null); // no username conflict

      const result = await service.update('user-1', {
        username: 'updated',
      } as any);

      expect(result).toBeDefined();
      expect((result as any).password).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should remove user', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await service.delete('user-1');

      expect(userRepo.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
