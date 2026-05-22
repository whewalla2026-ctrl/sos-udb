import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('MessagingService', () => {
  let service: MessagingService;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should deliver a clean message without flagging', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'Great job on your quest!');

      expect(result.content).toBe('Great job on your quest!');
      expect(result.moderated).toBe(true);
      expect(result.flagged).toBe(false);
      expect(result.senderId).toBe('user-1');
      expect(result.recipientId).toBe('user-2');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('message:sent', expect.objectContaining({
        senderId: 'user-1',
      }));
    });

    it('should flag messages containing violence keyword', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'I will use violence');

      expect(result.flagged).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('message:flagged', expect.objectContaining({
        reason: expect.stringContaining('violence'),
      }));
    });

    it('should flag messages containing hate keyword', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'This is hate speech');

      expect(result.flagged).toBe(true);
    });

    it('should flag messages containing explicit keyword', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'explicit content here');

      expect(result.flagged).toBe(true);
    });

    it('should flag messages containing phone numbers', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'Call me at 555-123-4567');

      expect(result.flagged).toBe(true);
    });

    it('should strip URLs from message content', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'Check this https://evil.com');

      expect(result.content).not.toContain('https://evil.com');
      expect(result.content).toContain('[URL REMOVED]');
      expect(result.flagged).toBe(true);
    });

    it('should allow safe messages through moderation', async () => {
      const result = await service.sendMessage('user-1', 'user-2', 'How was school today?');

      expect(result.flagged).toBe(false);
      expect(result.content).toBe('How was school today?');
    });
  });

  describe('reportMessage', () => {
    it('should emit message:reported event', async () => {
      await service.reportMessage('msg-1', 'user-1', 'inappropriate content');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('message:reported', {
        messageId: 'msg-1',
        reporterId: 'user-1',
        reason: 'inappropriate content',
      });
    });
  });
});
