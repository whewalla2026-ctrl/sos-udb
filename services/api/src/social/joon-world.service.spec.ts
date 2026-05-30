import { Test, TestingModule } from '@nestjs/testing';
import { JoonWorldService } from './joon-world.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('JoonWorldService', () => {
  let service: JoonWorldService;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoonWorldService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<JoonWorldService>(JoonWorldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('joinPod', () => {
    it('should join a pod successfully when age >= 13', async () => {
      const result = await service.joinPod('library-1', 'user-1', 13);

      expect(result.podId).toBe('library-1');
      expect(result.userId).toBe('user-1');
      expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.avatarColor).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('pod:user:joined', { podId: 'library-1', userId: 'user-1' });
    });

    it('should join a pod when age < 13 and parent approves', async () => {
      const result = await service.joinPod('library-1', 'user-2', 10);

      expect(result.userId).toBe('user-2');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw when pod is not found', async () => {
      await expect(service.joinPod('nonexistent', 'user-1', 13)).rejects.toThrow('Pod not found');
    });

    it('should throw when pod is full', async () => {
      await service.joinPod('library-1', 'user-1', 13);
      await service.joinPod('library-1', 'user-2', 13);
      await service.joinPod('library-1', 'user-3', 13);
      await service.joinPod('library-1', 'user-4', 13);

      await expect(service.joinPod('library-1', 'user-5', 13)).rejects.toThrow('Pod is full');
    });

    it('should throw when pod is not approved', async () => {
      const pod = (service as any).pods.get('library-1');
      pod.isApproved = false;
      (service as any).pods.set('library-1', pod);

      await expect(service.joinPod('library-1', 'user-1', 13)).rejects.toThrow('Pod not approved');
    });
  });

  describe('leavePod', () => {
    it('should remove user from pod and decrement count', async () => {
      await service.joinPod('library-1', 'user-1', 13);
      await service.leavePod('library-1', 'user-1');

      const users = await service.getPodUsers('library-1');
      expect(users).toHaveLength(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('pod:user:left', { podId: 'library-1', userId: 'user-1' });
    });

    it('should not throw when leaving a non-existent pod', async () => {
      await expect(service.leavePod('nonexistent', 'user-1')).resolves.toBeUndefined();
    });

    it('should not throw when user is not in pod', async () => {
      await service.joinPod('library-1', 'user-1', 13);
      await expect(service.leavePod('library-1', 'unknown-user')).resolves.toBeUndefined();
      const users = await service.getPodUsers('library-1');
      expect(users).toHaveLength(1);
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully when age >= 13', async () => {
      const result = await service.sendMessage('library-1', 'user-1', 'Hello!', 13);

      expect(result.podId).toBe('library-1');
      expect(result.userId).toBe('user-1');
      expect(result.message).toBe('Hello!');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('pod:message', expect.objectContaining({
        podId: 'library-1',
        userId: 'user-1',
        message: 'Hello!',
      }));
    });

    it('should throw when age < 13', async () => {
      await expect(service.sendMessage('library-1', 'user-1', 'Hello!', 12)).rejects.toThrow('Voice chat disabled for children under 13');
    });

    it('should emit pod:message event on successful send', async () => {
      await service.sendMessage('library-1', 'user-1', 'Hi', 13);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('pod:message', expect.objectContaining({ message: 'Hi' }));
    });
  });

  describe('getAvailablePods', () => {
    it('should return pods with available slots', async () => {
      const pods = await service.getAvailablePods(13);

      expect(pods.length).toBeGreaterThan(0);
      pods.forEach(p => {
        expect(p.currentUsers).toBeLessThan(p.maxUsers);
      });
    });

    it('should filter out non-approved pods for users under 13', async () => {
      const pods = await service.getAvailablePods(10);

      pods.forEach(p => {
        expect(p.isApproved).toBe(true);
      });
    });

    it('should not return full pods', async () => {
      await service.joinPod('library-1', 'user-1', 13);
      await service.joinPod('library-1', 'user-2', 13);
      await service.joinPod('library-1', 'user-3', 13);
      await service.joinPod('library-1', 'user-4', 13);
      (service as any).pods.get('library-1').currentUsers = 4;

      const pods = await service.getAvailablePods(13);
      expect(pods.find(p => p.id === 'library-1')).toBeUndefined();
    });
  });

  describe('getPodUsers', () => {
    it('should return users in a pod', async () => {
      await service.joinPod('library-1', 'user-1', 13);
      await service.joinPod('library-1', 'user-2', 13);

      const users = await service.getPodUsers('library-1');
      expect(users).toHaveLength(2);
    });

    it('should return empty array for pod with no users', async () => {
      const users = await service.getPodUsers('library-1');
      expect(users).toEqual([]);
    });

    it('should return empty array for unknown pod', async () => {
      const users = await service.getPodUsers('nonexistent');
      expect(users).toEqual([]);
    });
  });

  describe('getUserSBTs', () => {
    it('should return an empty array', async () => {
      const result = await service.getUserSBTs('user-1');
      expect(result).toEqual([]);
    });
  });
});
