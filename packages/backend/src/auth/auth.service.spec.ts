import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserEntity } from '../database/entities/user.entity';
import { SessionEntity } from '../database/entities/session.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(() => 'test-secret'),
    keyuri: jest.fn(() => 'otpauth://totp/test'),
    verify: jest.fn(() => true),
  },
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,qrcode')),
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-v4'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Record<string, jest.Mock>;
  let sessionRepo: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let auditLogService: Record<string, jest.Mock>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed-password',
    rootAdmin: false,
    usesTotp: false,
    enabled: true,
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'user-1', ...entity })),
      update: jest.fn(() => Promise.resolve()),
    };
    sessionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'session-1', ...entity })),
    };
    jwtService = {
      sign: jest.fn(() => 'jwt-access-token'),
    };
    auditLogService = {
      log: jest.fn(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(SessionEntity), useValue: sessionRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create user with hashed password and return user without password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

      const result = await service.register({
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(userRepo.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        username: 'newuser',
        password: 'hashed-pw',
      });
      expect(result.user).toBeDefined();
      expect((result as any).user.password).toBeUndefined();
    });

    it('should throw ConflictException for duplicate email', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'other',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'password123' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'wrong' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require 2FA when enabled', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        usesTotp: true,
        totpSecret: 'secret',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'password123' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result.requiresTwoFactor).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      sessionRepo.findOne.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'valid-token',
        revoked: false,
        lastActiveAt: new Date(),
      });
      userRepo.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.refreshToken('valid-token');

      expect(result.accessToken).toBe('jwt-access-token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw for revoked session', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('setupTwoFactor', () => {
    it('should generate secret and QR code', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, usesTotp: false });

      const result = await service.setupTwoFactor('user-1');

      expect(result.secret).toBe('test-secret');
      expect(result.qrCodeUrl).toContain('data:image/png');
    });
  });

  describe('getUserSessions', () => {
    it('should return active sessions for user', async () => {
      const sessions = [
        { id: 's1', ipAddress: '127.0.0.1', userAgent: 'Chrome', lastActiveAt: new Date() },
        { id: 's2', ipAddress: '10.0.0.1', userAgent: 'Firefox', lastActiveAt: new Date() },
      ];
      sessionRepo.find.mockResolvedValue(sessions);

      const result = await service.getUserSessions('user-1');

      expect(result).toHaveLength(2);
      expect(sessionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revoked: false },
        }),
      );
    });
  });

  describe('revokeSession', () => {
    it('should mark session as revoked', async () => {
      const session = { id: 'session-1', userId: 'user-1', revoked: false };
      sessionRepo.findOne.mockResolvedValue(session);

      await service.revokeSession('user-1', 'session-1');

      expect(session.revoked).toBe(true);
      expect(sessionRepo.save).toHaveBeenCalledWith(session);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.revokeSession('user-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
