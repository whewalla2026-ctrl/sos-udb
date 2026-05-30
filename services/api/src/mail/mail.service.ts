import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST', 'localhost');
    const port = parseInt(this.config.get<string>('SMTP_PORT', '1025'), 10);
    const user = this.config.get<string>('SMTP_USER', '');
    const pass = this.config.get<string>('SMTP_PASS', '');
    const skipVerify = this.config.get<string>('SMTP_SKIP_VERIFY', 'true') === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      tls: skipVerify ? { rejectUnauthorized: false } : undefined,
    });

    this.logger.log(`MailService configured: ${host}:${port}${user ? ` as ${user}` : ''}`);
  }

  async sendMail(options: { to: string; subject: string; text?: string; html?: string }): Promise<boolean> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@udb.app');
    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: "${options.subject}"`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${err}`);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3030');
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    return this.sendMail({
      to,
      subject: 'Reset Your UDB Password',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
          <p style="color: #666; font-size: 0.875rem;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(to: string, displayName: string): Promise<boolean> {
    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3030');
    return this.sendMail({
      to,
      subject: 'Welcome to UDB!',
      text: `Hi ${displayName},\n\nWelcome to UDB! Start your learning journey today.\n\nLogin: ${appUrl}/auth/login`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Welcome to UDB, ${displayName}!</h2>
          <p>We're excited to have you on board. Start your learning journey today.</p>
          <a href="${appUrl}/auth/login" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Get Started</a>
        </div>
      `,
    });
  }
}
