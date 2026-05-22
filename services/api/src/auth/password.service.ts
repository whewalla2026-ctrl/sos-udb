import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

export interface PasswordHashResult {
  hash: string;
  algorithm: 'argon2id' | 'bcrypt';
}

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 10;

  constructor() {}

  async hash(password: string): Promise<PasswordHashResult> {
    const hash = await argon2.hash(password, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
      type: argon2.argon2id,
    });
    return { hash, algorithm: 'argon2id' };
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    if (this.isArgon2Hash(storedHash)) {
      try {
        return await argon2.verify(storedHash, password);
      } catch {
        return false;
      }
    }

    if (this.isBcryptHash(storedHash)) {
      const isValid = await bcrypt.compare(password, storedHash);
      if (isValid) {
        return true;
      }
      return false;
    }

    return false;
  }

  async rehash(password: string, currentHash: string): Promise<PasswordHashResult> {
    const isValid = await this.verify(password, currentHash);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    if (this.isArgon2Hash(currentHash)) {
      return { hash: currentHash, algorithm: 'argon2id' };
    }

    return this.hash(password);
  }

  private isArgon2Hash(hash: string): boolean {
    return hash.startsWith('$argon2');
  }

  private isBcryptHash(hash: string): boolean {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2c$');
  }

  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
