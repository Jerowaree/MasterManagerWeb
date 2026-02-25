import { Injectable, Logger } from '@nestjs/common';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventPayload {
  code: string;
  severity: SecuritySeverity;
  message: string;
  ip?: string;
  userId?: string;
  companyId?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);
  private readonly webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim();

  async emit(event: SecurityEventPayload) {
    const normalized = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    const logLine = `[${event.severity.toUpperCase()}] ${event.code} ${event.message}`;
    if (event.severity === 'critical' || event.severity === 'high') {
      this.logger.error(logLine, JSON.stringify(normalized));
    } else if (event.severity === 'medium') {
      this.logger.warn(logLine, JSON.stringify(normalized));
    } else {
      this.logger.log(logLine, JSON.stringify(normalized));
    }

    if (!this.webhookUrl || (event.severity !== 'critical' && event.severity !== 'high')) {
      return;
    }

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      });
    } catch (error: any) {
      this.logger.error(`No se pudo enviar alerta de seguridad: ${error?.message ?? 'unknown'}`);
    }
  }
}
