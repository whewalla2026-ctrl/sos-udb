jest.mock('firebase-admin', () => {
  const apps: any[] = [];
  return {
    apps,
    credential: { cert: jest.fn(), applicationDefault: jest.fn() },
    initializeApp: jest.fn().mockImplementation(() => { apps.push({}); }),
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn(),
    }),
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { MetricsService } from '../shared/metrics.controller';
import * as admin from 'firebase-admin';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    doterProfile: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
    verify: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMetrics = {
    authFailures: { inc: jest.fn() },
    signupsTotal: { inc: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create new user with firebase login', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
        role: 'CHILD',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const newUser = { id: 'user-1', firebaseUid: 'firebase-uid-123', email: 'test@example.com', role: 'CHILD', isDeleted: false };
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockPrisma.doterProfile.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockRedis.set.mockResolvedValue('OK');
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.user.update.mockResolvedValue(newUser);

      const result = await service.loginWithFirebase('test-id-token');

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.doterProfile.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
      expect(result.accessToken).toBe('access-token');
      expect(result.user).toEqual(newUser);
    });

    it('should return existing user on firebase login', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'existing@example.com',
        role: 'CHILD',
      });
      const existingUser = { id: 'user-1', firebaseUid: 'firebase-uid-123', email: 'existing@example.com', role: 'CHILD', isDeleted: false };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockRedis.set.mockResolvedValue('OK');
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.user.update.mockResolvedValue(existingUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.loginWithFirebase('test-id-token');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.doterProfile.create).not.toHaveBeenCalled();
      expect(result.user).toEqual(existingUser);
    });
  });

  describe('refreshAccessToken', () => {
    it('should issue new tokens with valid refresh token', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'u1' }));
      const user = { id: 'u1', email: 'test@test.com', role: 'CHILD', isDeleted: false };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockJwt.sign.mockReturnValue('new-token');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.refreshAccessToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should throw on invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw on deactivated user', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'u1' }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', isDeleted: true });

      await expect(service.refreshAccessToken('token')).rejects.toThrow('User not found or deactivated');
    });
  });

  describe('logout', () => {
    it('should blacklist access token jti', async () => {
      mockJwt.verify.mockReturnValue({ jti: 'abc', exp: Math.floor(Date.now() / 1000) + 3600 });
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      await service.logout('access-token', 'refresh-token');

      expect(mockRedis.set).toHaveBeenCalledWith('blacklist:abc', 'true', 'EX', expect.any(Number));
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('refresh:'));
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted jti', async () => {
      mockRedis.get.mockResolvedValue('true');

      const result = await service.isTokenBlacklisted('abc');

      expect(result).toBe(true);
    });
  });
});
