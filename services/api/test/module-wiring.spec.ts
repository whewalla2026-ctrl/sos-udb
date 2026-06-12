import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('AppModule Wiring', () => {
  it('should compile the full AppModule with all providers', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(module).toBeDefined();
  }, 30000);
});
