import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { tenantStorage } from '../../common/store/tenant.store';
import { buildCompanyEmailDomain } from '../../common/utils/company-domain.utils';
import { getJwtSigningSecret, getJwtVerificationSecrets } from './auth.config';
import { SecurityEventsService } from '../security/security-events.service';

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? '5');
  private readonly lockoutMinutes = Number(process.env.AUTH_LOCKOUT_MINUTES ?? '15');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private securityEvents: SecurityEventsService,
  ) {}

  async register(dto: RegisterDto) {
    return tenantStorage.run({ isPublic: true }, async () => {
      const {
        email, password, companyName, country, currency, timezone, branchName
      } = dto;

      const existingUser = await this.prisma.client.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (existingUser) {
        await this.securityEvents.emit({
          code: 'auth_register_email_conflict',
          severity: 'medium',
          message: 'Intento de registro con correo existente',
          metadata: {
            domain: email.includes('@') ? email.split('@')[1] : 'invalid',
          },
        });

        // Normalize timing to make user enumeration less reliable.
        await bcrypt.hash(password, 12);
        throw new ConflictException('No se pudo completar el registro');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await this.prisma.client.$transaction(async (tx: any) => {
        const company = await tx.company.create({
          data: {
            name: companyName,
            emailDomain: buildCompanyEmailDomain(companyName),
            country,
            currency,
            timezone,
            plan: 'free_trial',
            status: 'active',
          },
        });

        const branch = await tx.branch.create({
          data: {
            name: branchName || 'Principal',
            companyId: company.id,
            timezone,
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            companyId: company.id,
            branchId: branch.id,
            role: 'owner',
            sessionVersion: 0,
          },
        });

        await tx.subscription.create({
          data: {
            companyId: company.id,
            plan: 'free_trial',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        });

        return { user, company };
      });

      return this.login(result.user);
    });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    return tenantStorage.run({ isPublic: true }, async () => {
      const user = await this.prisma.client.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        await this.securityEvents.emit({
          code: 'auth_login_locked_account',
          severity: 'high',
          message: 'Intento de login en cuenta temporalmente bloqueada',
          userId: user.id,
          companyId: user.companyId,
          metadata: { email, lockedUntil: user.lockedUntil.toISOString() },
        });
        throw new UnauthorizedException(
          `Cuenta bloqueada temporalmente. Intenta de nuevo despues de ${this.lockoutMinutes} minutos.`
        );
      }

      if (user && (await bcrypt.compare(pass, user.passwordHash))) {
        if ((user.failedLoginAttempts ?? 0) > 0 || user.lockedUntil) {
          await this.prisma.client.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }
        const { passwordHash, refreshTokenHash, ...result } = user;
        return result;
      }

      if (user) {
        const nextAttempts = (user.failedLoginAttempts ?? 0) + 1;
        const shouldLock = nextAttempts >= this.maxLoginAttempts;
        await this.prisma.client.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: nextAttempts,
            lockedUntil: shouldLock
              ? new Date(Date.now() + this.lockoutMinutes * 60 * 1000)
              : null,
          },
        });
      }

      await this.securityEvents.emit({
        code: 'auth_login_failed',
        severity: 'medium',
        message: 'Intento de login fallido por credenciales invalidas',
        metadata: { email },
      });
      return null;
    });
  }

  async login(user: any) {
    return tenantStorage.run({ isPublic: true }, async () => {
      const tokens = await this.issueTokens(user);
      await this.persistRefreshTokenHash(user.id, tokens.refresh_token);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
          branchId: user.branchId,
          role: user.role,
        },
      };
    });
  }

  async refreshAccessToken(refreshToken: string) {
    return tenantStorage.run({ isPublic: true }, async () => {
      const payload = await this.verifyRefreshToken(refreshToken);

      const user = await this.prisma.client.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
      });

      if (!user) {
        await this.securityEvents.emit({
          code: 'auth_refresh_user_not_found',
          severity: 'high',
          message: 'Refresh token valido apunta a usuario inexistente',
          userId: payload?.sub,
        });
        throw new UnauthorizedException('Sesion invalida');
      }

      if (payload.sv !== user.sessionVersion) {
        await this.securityEvents.emit({
          code: 'auth_refresh_session_mismatch',
          severity: 'medium',
          message: 'Refresh token con version de sesion antigua',
          userId: user.id,
          companyId: user.companyId,
        });
        throw new UnauthorizedException('Sesion expirada');
      }

      if (!user.refreshTokenHash) {
        await this.securityEvents.emit({
          code: 'auth_refresh_hash_missing',
          severity: 'high',
          message: 'Refresh token presentado pero hash ya no existe',
          userId: user.id,
          companyId: user.companyId,
        });
        throw new UnauthorizedException('Refresh token invalido');
      }

      const validHash = await this.verifyStoredRefreshToken(user.refreshTokenHash, refreshToken);
      if (!validHash) {
        await this.securityEvents.emit({
          code: 'auth_refresh_hash_mismatch',
          severity: 'high',
          message: 'Refresh token no coincide con hash almacenado',
          userId: user.id,
          companyId: user.companyId,
        });
        throw new UnauthorizedException('Refresh token invalido');
      }

      const tokens = await this.issueTokens(user);
      await this.persistRefreshTokenHash(user.id, tokens.refresh_token);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
          branchId: user.branchId,
          role: user.role,
        },
      };
    });
  }

  async logout(userId: string) {
    await tenantStorage.run({ isPublic: true }, async () => {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          sessionVersion: { increment: 1 },
          refreshTokenHash: null,
        },
      });
    });
  }

  private async issueTokens(user: any) {
    const basePayload = {
      email: user.email,
      sub: user.id,
      companyId: user.companyId,
      branchId: user.branchId,
      role: user.role,
      sv: user.sessionVersion ?? 0,
    };

    const access_token = this.jwtService.sign(
      { ...basePayload, typ: 'access' },
      { expiresIn: '15m', secret: getJwtSigningSecret() }
    );

    const refresh_token = this.jwtService.sign(
      { ...basePayload, typ: 'refresh', jti: randomUUID() },
      { expiresIn: '7d', secret: getJwtSigningSecret() }
    );

    return { access_token, refresh_token };
  }

  private async persistRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  private hashRefreshToken(refreshToken: string): string {
    return `sha256:${createHash('sha256').update(refreshToken).digest('hex')}`;
  }

  private async verifyStoredRefreshToken(storedHash: string, refreshToken: string): Promise<boolean> {
    if (storedHash.startsWith('sha256:')) {
      const candidate = this.hashRefreshToken(refreshToken);
      const left = Buffer.from(storedHash);
      const right = Buffer.from(candidate);
      if (left.length !== right.length) {
        return false;
      }
      return timingSafeEqual(left, right);
    }

    // Backward compatibility: old records may still use bcrypt hashes.
    return bcrypt.compare(refreshToken, storedHash);
  }

  private async verifyRefreshToken(token: string) {
    for (const secret of getJwtVerificationSecrets()) {
      try {
        const payload: any = this.jwtService.verify(token, { secret });
        if (payload.typ !== 'refresh') {
          throw new UnauthorizedException('Tipo de token invalido');
        }
        return payload;
      } catch {
        // keep trying with previous rotated secrets
      }
    }

    await this.securityEvents.emit({
      code: 'auth_refresh_invalid_or_expired',
      severity: 'medium',
      message: 'Refresh token invalido o expirado',
    });
    throw new UnauthorizedException('Refresh token invalido o expirado');
  }
}
