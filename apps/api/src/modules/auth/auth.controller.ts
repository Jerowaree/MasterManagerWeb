import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  UnauthorizedException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { randomBytes } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { BotProtectionService } from '../security/bot-protection.service';
import { CookieOptions } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly botProtection: BotProtectionService
  ) {}

  private buildCookieOptions(overrides?: CookieOptions): CookieOptions {
    const secure = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;
    return {
      secure,
      sameSite: 'lax',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      ...overrides,
    };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const csrfToken = randomBytes(24).toString('hex');

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      ...this.buildCookieOptions(),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      ...this.buildCookieOptions({ path: '/auth/refresh' }),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      ...this.buildCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', this.buildCookieOptions());
    res.clearCookie('refresh_token', this.buildCookieOptions({ path: '/auth/refresh' }));
    res.clearCookie('csrf_token', this.buildCookieOptions());
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.botProtection.validate({
      route: '/auth/register',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      honeypot: registerDto.website,
      submissionStartedAt: registerDto.submissionStartedAt,
      captchaToken: registerDto.captchaToken,
    });

    const result = await this.authService.register(registerDto);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result.user;
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.botProtection.validate({
      route: '/auth/login',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      honeypot: loginDto.website,
      submissionStartedAt: loginDto.submissionStartedAt,
      captchaToken: loginDto.captchaToken,
    });

    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const result = await this.authService.login(user);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result.user;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token faltante');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(req.user.id);
    this.clearAuthCookies(res);
    return { message: 'Sesion cerrada' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  me(@Req() req: any) {
    return {
      id: req.user.id,
      email: req.user.email,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      role: req.user.role,
    };
  }
}
