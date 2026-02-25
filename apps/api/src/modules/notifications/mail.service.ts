import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend?: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly isEnabled: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const isProd = process.env.NODE_ENV === 'production';

    if (!apiKey) {
      this.isEnabled = false;
      if (isProd) {
        throw new Error('RESEND_API_KEY es obligatorio en produccion');
      }
      this.logger.warn('RESEND_API_KEY no configurado. Envio de correos deshabilitado en este entorno.');
      return;
    }

    this.isEnabled = true;
    this.resend = new Resend(apiKey);
  }

  async sendMailWithAttachment(to: string, subject: string, html: string, filename: string, content: Buffer) {
    if (!this.isEnabled || !this.resend) {
      return { success: false, error: 'mail_disabled' };
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Master Manager <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        attachments: [
          {
            filename,
            content: content.toString('base64'),
          },
        ],
      });

      if (error) {
        this.logger.error(`Error sending email: ${error.message}`);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err: any) {
      this.logger.error(`Failed to send email: ${err.message}`);
      return { success: false, error: err };
    }
  }

  async sendSimpleMail(to: string, subject: string, html: string) {
    if (!this.isEnabled || !this.resend) {
      return { success: false, error: 'mail_disabled' };
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Master Manager <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Error sending email: ${error.message}`);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err: any) {
      this.logger.error(`Failed to send email: ${err.message}`);
      return { success: false, error: err };
    }
  }
}
