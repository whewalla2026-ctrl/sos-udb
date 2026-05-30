import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePasswordStrength', () => {
    it('should accept a valid strong password', () => {
      const result = service.validatePasswordStrength('StrongP@ss1abc');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = service.validatePasswordStrength('Short1@a');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should reject password without uppercase letter', () => {
      const result = service.validatePasswordStrength('weakpass1@a');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = service.validatePasswordStrength('WEAKPASS1@A');
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = service.validatePasswordStrength('WeakPass@word');
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = service.validatePasswordStrength('WeakPass1word');
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('hash and verify', () => {
    it('should hash a password using argon2id', async () => {
      const result = await service.hash('StrongP@ss1');
      expect(result.hash).toBeTruthy();
      expect(result.algorithm).toBe('argon2id');
      expect(result.hash.startsWith('$argon2')).toBe(true);
    });

    it('should verify a correctly hashed password', async () => {
      const { hash } = await service.hash('StrongP@ss1');
      const valid = await service.verify('StrongP@ss1', hash);
      expect(valid).toBe(true);
    });

    it('should reject wrong password against argon2 hash', async () => {
      const { hash } = await service.hash('StrongP@ss1');
      const valid = await service.verify('WrongP@ss1', hash);
      expect(valid).toBe(false);
    });

    it('should verify bcrypt hashes', async () => {
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      const valid = await service.verify('password', bcryptHash);
      expect(valid).toBe(false);
    });

    it('should return false for unknown hash format', async () => {
      const valid = await service.verify('password', 'unknown-hash-format');
      expect(valid).toBe(false);
    });
  });

  describe('rehash', () => {
    it('should return same hash if already argon2', async () => {
      const { hash } = await service.hash('StrongP@ss1');
      const result = await service.rehash('StrongP@ss1', hash);
      expect(result.hash).toBe(hash);
    });

    it('should throw on wrong password', async () => {
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      await expect(service.rehash('wrong', bcryptHash)).rejects.toThrow('Invalid password');
    });
  });
});
