import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SecurityEventsService } from './security-events.service';

type BotMode = 'off' | 'basic' | 'turnstile';

interface BotCheckInput {
  route: string;
  ip?: string;
  userAgent?: string;
  honeypot?: string;
  submissionStartedAt?: number;
  captchaToken?: string;
}

@Injectable()
export class BotProtectionService {
  private readonly turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
  private readonly mode: BotMode = this.resolveMode();

  constructor(private readonly securityEvents: SecurityEventsService) {}

  private resolveMode(): BotMode {
    const configured = (process.env.BOT_PROTECTION_MODE ?? '').trim().toLowerCase();
    if (configured === 'off' || configured === 'basic' || configured === 'turnstile') {
      return configured;
    }
    return process.env.NODE_ENV === 'production' ? 'basic' : 'off';
  }

  async validate(input: BotCheckInput) {
    if (this.mode === 'off') {
      return;
    }

    const honeypot = (input.honeypot ?? '').trim();
    if (honeypot.length > 0) {
      await this.securityEvents.emit({
        code: 'bot_honeypot_triggered',
        severity: 'high',
        message: 'Se detecto intento automatizado por honeypot',
        ip: input.ip,
        route: input.route,
        metadata: { userAgent: input.userAgent },
      });
      throw new UnauthorizedException('Solicitud bloqueada por seguridad');
    }

    if (typeof input.submissionStartedAt === 'number') {
      const elapsed = Date.now() - input.submissionStartedAt;
      if (elapsed < 800 || elapsed > 2 * 60 * 60 * 1000) {
        await this.securityEvents.emit({
          code: 'bot_submission_timing_anomaly',
          severity: 'medium',
          message: 'Patron de envio sospechoso detectado',
          ip: input.ip,
          route: input.route,
          metadata: { elapsedMs: elapsed, userAgent: input.userAgent },
        });
        throw new BadRequestException('Solicitud invalida');
      }
    }

    if (this.mode === 'turnstile') {
      if (!this.turnstileSecret) {
        throw new Error(
          'TURNSTILE_SECRET_KEY es obligatorio cuando BOT_PROTECTION_MODE=turnstile'
        );
      }
      await this.verifyTurnstile(input);
    }
  }

  private async verifyTurnstile(input: BotCheckInput) {
    if (!input.captchaToken) {
      throw new UnauthorizedException('Validacion anti-bot requerida');
    }

    const body = new URLSearchParams({
      secret: this.turnstileSecret!,
      response: input.captchaToken,
      ...(input.ip ? { remoteip: input.ip } : {}),
    });

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('No se pudo validar anti-bot');
    }

    const verification = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!verification.success) {
      await this.securityEvents.emit({
        code: 'bot_turnstile_failed',
        severity: 'high',
        message: 'Turnstile rechazo la solicitud',
        ip: input.ip,
        route: input.route,
        metadata: { errors: verification['error-codes'], userAgent: input.userAgent },
      });
      throw new UnauthorizedException('Validacion anti-bot fallida');
    }
  }
}
