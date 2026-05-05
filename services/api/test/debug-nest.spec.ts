import { Test, TestingModule } from '@nestjs/testing';
import { UupSyncModule } from '../src/uup-sync/uup-sync.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/redis/redis.module';

describe('Isolated Module Test', () => {
  it('should compile UupSyncModule', async () => {
    const module = await Test.createTestingModule({
      imports: [UupSyncModule],
    })
    .overrideProvider(PrismaService).useValue({})
    .overrideProvider(REDIS_CLIENT).useValue({})
    .compile();
    expect(module).toBeDefined();
  });
});
