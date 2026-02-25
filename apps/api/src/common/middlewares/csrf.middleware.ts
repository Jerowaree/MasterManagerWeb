import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SecurityEventsService } from '../../modules/security/security-events.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/auth/login', '/auth/register']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly securityEvents: SecurityEventsService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    if (EXEMPT_PATHS.has(req.path)) {
      next();
      return;
    }

    const hasSessionCookie = Boolean(req.cookies?.access_token || req.cookies?.refresh_token);
    if (!hasSessionCookie) {
      next();
      return;
    }

    const csrfCookie = req.cookies?.csrf_token;
    const csrfHeader = req.headers['x-csrf-token'];

    if (
      !csrfCookie ||
      typeof csrfHeader !== 'string' ||
      csrfHeader.trim().length === 0 ||
      csrfHeader !== csrfCookie
    ) {
      await this.securityEvents.emit({
        code: 'csrf_validation_failed',
        severity: 'high',
        message: 'Solicitud mutable rechazada por CSRF invalido',
        ip: req.ip,
        route: req.path,
        metadata: { method: req.method, userAgent: req.headers['user-agent'] },
      });
      throw new UnauthorizedException('CSRF token invalido o faltante');
    }

    next();
  }
}
