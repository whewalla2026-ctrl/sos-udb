import { Test, TestingModule } from '@nestjs/testing';
import { VisionService } from './vision.service';
import { getQueueToken } from '@nestjs/bullmq';
import { S3Service } from '../shared/s3.service';
import { QUEUES } from '../queue/queue.module';

describe('VisionService', () => {
  let service: VisionService;

  const mockQueue = {
    add: jest.fn(),
  };

  const mockS3 = {
    download: jest.fn().mockResolvedValue(Buffer.from('test')),
    upload: jest.fn().mockResolvedValue('https://s3.example.com/key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisionService,
        { provide: getQueueToken(QUEUES.VISION), useValue: mockQueue },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<VisionService>(VisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processProof', () => {
    it('should AUTO_APPROVE when similarity >= 0.85', async () => {
      const result = await service.processProof({
        userId: 'user-1',
        questId: 'quest-1',
        mediaUrl: 's3://bucket/path/image.jpg',
        mediaType: 'image',
      });

      expect(result.decision).toBe('AUTO_APPROVE');
      expect(result.score).toBeGreaterThanOrEqual(0.85);
    });

    it('should PARENT_QUEUE when score 0.60-0.84', async () => {
      jest.spyOn(service as any, 'runSiameseModel').mockResolvedValue({ similarity: 0.75 });

      const result = await service.processProof({
        userId: 'user-1',
        questId: 'quest-1',
        mediaUrl: 's3://bucket/path/image.jpg',
        mediaType: 'image',
      });

      expect(result.decision).toBe('PARENT_QUEUE');
    });

    it('should REJECT when score < 0.60', async () => {
      jest.spyOn(service as any, 'runSiameseModel').mockResolvedValue({ similarity: 0.45 });

      const result = await service.processProof({
        userId: 'user-1',
        questId: 'quest-1',
        mediaUrl: 's3://bucket/path/image.jpg',
        mediaType: 'image',
      });

      expect(result.decision).toBe('REJECT');
    });

    it('should queue retry job on rejection', async () => {
      jest.spyOn(service as any, 'runSiameseModel').mockResolvedValue({ similarity: 0.45 });

      await service.processProof({
        userId: 'user-1',
        questId: 'quest-1',
        mediaUrl: 's3://bucket/path/image.jpg',
        mediaType: 'image',
      });

      expect(mockQueue.add).toHaveBeenCalledWith('retry', expect.objectContaining({ userId: 'user-1' }), expect.any(Object));
    });

    it('should queue log-result job after processing', async () => {
      await service.processProof({
        userId: 'user-1',
        questId: 'quest-1',
        mediaUrl: 's3://bucket/path/image.jpg',
        mediaType: 'image',
      });

      expect(mockQueue.add).toHaveBeenCalledWith('log-result', expect.objectContaining({ userId: 'user-1' }), expect.any(Object));
    });

    it('should throw on S3 download failure', async () => {
      mockS3.download.mockRejectedValue(new Error('S3 download failed'));

      await expect(service.processProof({
        userId: 'user-1',
        questId: 'quest-1',
        mediaUrl: 's3://bucket/path/image.jpg',
        mediaType: 'image',
      })).rejects.toThrow('S3 download failed');
    });
  });
});
