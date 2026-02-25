import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // In production, this should be in an environment variable
    const apiKey = process.env.RESEND_API_KEY || 're_123456789';
    this.resend = new Resend(apiKey);
  }

  async sendMailWithAttachment(to: string, subject: string, html: string, filename: string, content: Buffer) {
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
