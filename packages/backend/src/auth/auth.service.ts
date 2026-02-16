import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../database/entities/user.entity';
import { SessionEntity } from '../database/entities/session.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '@nexus/shared';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
    });
    const saved = await this.userRepo.save(user);

    await this.auditLogService.log({
      userId: saved.id,
      event: 'user.created',
      ip: '',
    });

    return {
      user: {
        id: saved.id,
        email: saved.email,
        username: saved.username,
      },
    };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.enabled) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.usesTotp) {
      // Issue a temporary session token for the 2FA verification step
      const tempPayload = { sub: user.id, purpose: 'two-factor' };
      const sessionToken = this.jwtService.sign(tempPayload, { expiresIn: '5m' });

      return {
        requiresTwoFactor: true,
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          rootAdmin: user.rootAdmin,
          usesTotp: user.usesTotp,
        },
      };
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rootAdmin: user.rootAdmin,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const session = this.sessionRepo.create({
      userId: user.id,
      refreshToken,
      ipAddress: ip,
      userAgent,
      lastActiveAt: new Date(),
    });
    await this.sessionRepo.save(session);

    await this.auditLogService.log({
      userId: user.id,
      event: 'user.login',
      ip: ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        rootAdmin: user.rootAdmin,
        usesTotp: user.usesTotp,
      },
    };
  }

  async refreshToken(token: string) {
    const session = await this.sessionRepo.findOne({
      where: { refreshToken: token, revoked: false },
    });
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user || !user.enabled) {
      throw new UnauthorizedException('User not found or disabled');
    }

    session.lastActiveAt = new Date();
    await this.sessionRepo.save(session);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rootAdmin: user.rootAdmin,
    };

    return { accessToken: this.jwtService.sign(payload) };
  }

  async logout(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    session.revoked = true;
    await this.sessionRepo.save(session);
  }

  async setupTwoFactor(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.usesTotp) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Nexus Panel', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    user.pendingTotpSecret = secret;
    await this.userRepo.save(user);

    return { secret, qrCodeUrl };
  }

  async verifyTwoFactorSetup(userId: string, code: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.pendingTotpSecret) {
      throw new BadRequestException('Two-factor setup not initiated');
    }

    const valid = authenticator.verify({
      token: code,
      secret: user.pendingTotpSecret,
    });
    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate 8 backup codes (16-char alphanumeric)
    const plaintextBackupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(12).toString('base64url').substring(0, 16),
    );
    const hashedBackupCodes = await Promise.all(
      plaintextBackupCodes.map((c) => bcrypt.hash(c, 10)),
    );

    user.totpSecret = user.pendingTotpSecret;
    user.pendingTotpSecret = undefined as any;
    user.usesTotp = true;
    user.backupCodes = hashedBackupCodes;
    await this.userRepo.save(user);

    return { backupCodes: plaintextBackupCodes };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.usesTotp || !user.totpSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const valid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });
    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.totpSecret = undefined as any;
    user.usesTotp = false;
    user.backupCodes = undefined as any;
    await this.userRepo.save(user);

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async verifyTwoFactorLogin(sessionToken: string, code: string, ip: string, userAgent: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(sessionToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    if (payload.purpose !== 'two-factor') {
      throw new UnauthorizedException('Invalid session token');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.enabled) {
      throw new UnauthorizedException('User not found or disabled');
    }
    if (!user.totpSecret) {
      throw new BadRequestException('Two-factor authentication is not configured');
    }

    // Try TOTP verification first
    const totpValid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!totpValid) {
      // Try backup codes
      let backupCodeMatch = false;
      if (user.backupCodes && user.backupCodes.length > 0) {
        for (let i = 0; i < user.backupCodes.length; i++) {
          const match = await bcrypt.compare(code, user.backupCodes[i]);
          if (match) {
            // Consume the backup code (single-use)
            user.backupCodes.splice(i, 1);
            await this.userRepo.save(user);
            backupCodeMatch = true;
            break;
          }
        }
      }

      if (!backupCodeMatch) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    // Issue full tokens
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rootAdmin: user.rootAdmin,
    };
    const accessToken = this.jwtService.sign(jwtPayload);
    const refreshToken = uuidv4();

    const session = this.sessionRepo.create({
      userId: user.id,
      refreshToken,
      ipAddress: ip,
      userAgent,
      lastActiveAt: new Date(),
    });
    await this.sessionRepo.save(session);

    await this.auditLogService.log({
      userId: user.id,
      event: 'user.login',
      ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        rootAdmin: user.rootAdmin,
        usesTotp: user.usesTotp,
      },
    };
  }

  async getUserSessions(userId: string) {
    return this.sessionRepo.find({
      where: { userId, revoked: false },
      order: { lastActiveAt: 'DESC' },
      select: ['id', 'ipAddress', 'userAgent', 'lastActiveAt', 'createdAt'],
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    session.revoked = true;
    await this.sessionRepo.save(session);
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { id: userId, enabled: true },
    });
  }
}
