import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantStorage } from '../../common/store/tenant.store';
import { getJwtVerificationSecrets } from './auth.config';
import { SecurityEventsService } from '../security/security-events.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityEvents: SecurityEventsService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          return req?.cookies?.access_token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKeyProvider: (_req, rawJwtToken, done) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const jwt = require('jsonwebtoken');
        const secrets = getJwtVerificationSecrets();

        for (const secret of secrets) {
          try {
            jwt.verify(rawJwtToken, secret);
            done(null, secret);
            return;
          } catch {
            // continue
          }
        }

        done(new UnauthorizedException('Token invalido'), undefined);
      },
    });
  }

  async validate(payload: any) {
    if (payload.typ !== 'access') {
      await this.securityEvents.emit({
        code: 'jwt_invalid_type',
        severity: 'medium',
        message: 'Se detecto token con tipo no permitido en estrategia access',
        userId: payload?.sub,
      });
      throw new UnauthorizedException('Token de acceso invalido');
    }

    const user = await tenantStorage.run({ isPublic: true }, async () => {
      return this.prisma.client.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: {
          id: true,
          email: true,
          companyId: true,
          branchId: true,
          role: true,
          sessionVersion: true,
        },
      });
    });

    if (!user) {
      await this.securityEvents.emit({
        code: 'jwt_user_not_found',
        severity: 'high',
        message: 'Token valido pero usuario no existe o fue eliminado',
        userId: payload?.sub,
      });
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if ((payload.sv ?? 0) !== user.sessionVersion) {
      await this.securityEvents.emit({
        code: 'jwt_session_version_mismatch',
        severity: 'medium',
        message: 'Token reutilizado con version de sesion antigua',
        userId: user.id,
        companyId: user.companyId,
      });
      throw new UnauthorizedException('Sesion invalidada');
    }

    return {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      branchId: user.branchId,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
  }
}
