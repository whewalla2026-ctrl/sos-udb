import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

jest.mock('nodemailer', () => {
  const sendMail = jest.fn<any, any>(() => Promise.resolve(true));
  return {
    createTransport: jest.fn().mockReturnValue({ sendMail }),
    __mockSendMail: sendMail,
  };
});

describe('MailService', () => {
  let service: MailService;
  let nodemailer: any;

  const mockConfig: Record<string, string> = {
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'noreply@udb.app',
    SMTP_SKIP_VERIFY: 'true',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3030',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    nodemailer = require('nodemailer');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => mockConfig[key] ?? defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    it('should send an email successfully', async () => {
      const result = await service.sendMail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Hello',
      });
      expect(result).toBe(true);
      expect(nodemailer.__mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@example.com', subject: 'Test', text: 'Hello' }),
      );
    });

    it('should send an HTML email', async () => {
      const result = await service.sendMail({
        to: 'test@example.com',
        subject: 'Test HTML',
        html: '<p>Hello</p>',
      });
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      nodemailer.__mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));
      const result = await service.sendMail({
        to: 'test@example.com',
        subject: 'Fail',
        text: 'Should fail',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send a password reset email with token in link', async () => {
      const result = await service.sendPasswordResetEmail('test@example.com', 'abc123');
      expect(result).toBe(true);
      expect(nodemailer.__mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Reset Your UDB Password',
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send a welcome email with display name', async () => {
      const result = await service.sendWelcomeEmail('test@example.com', 'TestUser');
      expect(result).toBe(true);
      expect(nodemailer.__mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Welcome to UDB!',
        }),
      );
    });
  });
});
