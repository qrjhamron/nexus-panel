import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, TwoFactorVerifyDto, TwoFactorLoginDto } from './dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.login(dto, ip, userAgent);

    if ('refreshToken' in result) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Set nexus_session cookie with the access token
      if ('accessToken' in result) {
        const isSecure = req.protocol === 'https';
        res.cookie('nexus_session', result.accessToken, {
          httpOnly: true,
          sameSite: 'strict',
          secure: isSecure,
          path: '/',
          maxAge: 15 * 60 * 1000, // 15 min
        });
      }

      const { refreshToken, ...body } = result;
      return body;
    }

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return { statusCode: 401, message: 'No refresh token provided' };
    }
    const result = await this.authService.refreshToken(token);

    // Also refresh the nexus_session cookie
    const isSecure = req.protocol === 'https';
    res.cookie('nexus_session', result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isSecure,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) {
      res.clearCookie('refreshToken', { path: '/' });
    }
    // Clear nexus_session cookie
    res.clearCookie('nexus_session', {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.protocol === 'https',
      path: '/',
      maxAge: 0,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user from JWT' })
  async me(@Req() req: Request) {
    // Read JWT from nexus_session cookie or Authorization header
    let token: string | undefined;
    if (req.cookies?.nexus_session) {
      token = req.cookies.nexus_session;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or disabled');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      rootAdmin: user.rootAdmin,
      usesTotp: user.usesTotp,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  @Post('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup two-factor authentication' })
  async setupTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @Post('2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable two-factor authentication' })
  async verifyTwoFactor(
    @CurrentUser('id') userId: string,
    @Body() dto: TwoFactorVerifyDto,
  ) {
    return this.authService.verifyTwoFactorSetup(userId, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  async disableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body() dto: TwoFactorVerifyDto,
  ) {
    return this.authService.disableTwoFactor(userId, dto.code);
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with two-factor code' })
  async verifyTwoFactorLogin(
    @Body() dto: TwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.verifyTwoFactorLogin(
      dto.sessionToken,
      dto.code,
      ip,
      userAgent,
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Set nexus_session cookie
    const isSecure = req.protocol === 'https';
    res.cookie('nexus_session', result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isSecure,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    const { refreshToken, ...body } = result;
    return body;
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getUserSessions(userId);
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }
}
