import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockIntegrationService } from './mock-integration.service';

describe('MockIntegrationService', () => {
  let service: MockIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockIntegrationService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();

    service = module.get<MockIntegrationService>(MockIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return mock OpenAI completion', async () => {
    const result = await service.openaiComplete('Test prompt');
    expect(result.content).toContain('simulated AI response');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.usage.promptTokens).toBeGreaterThan(0);
  });

  it('should return mock OpenAI embedding vector', async () => {
    const result = await service.openaiEmbed('test');
    expect(result.length).toBe(1536);
    expect(typeof result[0]).toBe('number');
  });

  it('should return mock Pinecone query results', async () => {
    const result = await service.pineconeQuery([0.1, 0.2, 0.3], 5);
    expect(result.matches.length).toBeLessThanOrEqual(5);
    expect(result.matches[0]).toHaveProperty('id');
    expect(result.matches[0]).toHaveProperty('score');
  });

  it('should handle Pinecone upsert without error', async () => {
    await expect(service.pineconeUpsert('test-id', [0.1, 0.2])).resolves.toBeUndefined();
  });

  it('should return mock Stripe payment', async () => {
    const result = await service.stripeCreatePayment(999, 'usd', 'tok_visa');
    expect(result.id).toContain('pi_mock_');
    expect(result.status).toBe('succeeded');
    expect(result.amount).toBe(999);
  });

  it('should return mock Stripe subscription', async () => {
    const result = await service.stripeCreateSubscription('cus_mock', 'price_mock');
    expect(result.id).toContain('sub_mock_');
    expect(result.status).toBe('active');
  });

  it('should return mock Stripe refund', async () => {
    const result = await service.stripeRefund('pi_mock_123');
    expect(result.status).toBe('refunded');
  });

  it('should return mock S3 upload response', async () => {
    const result = await service.s3Upload('test.txt', Buffer.from('test'), 'text/plain');
    expect(result.bucket).toBe('udb-media-mock');
    expect(result.key).toBe('test.txt');
    expect(result.url).toContain('mock-s3');
  });

  it('should return mock S3 presigned URL', async () => {
    const url = await service.s3GetPresignedUrl('test.txt');
    expect(url).toContain('mock-s3');
  });

  it('should handle S3 delete without error', async () => {
    await expect(service.s3Delete('test.txt')).resolves.toBeUndefined();
  });

  it('should return mock email response', async () => {
    const result = await service.emailSend('test@test.com', 'Subject', 'Body');
    expect(result.accepted).toContain('test@test.com');
    expect(result.rejected).toEqual([]);
    expect(result.messageId).toContain('mock');
  });

  it('should return mock blockchain mint response', async () => {
    const result = await service.blockchainMintToken('user-1', 'https://metadata.url');
    expect(result.txHash).toMatch(/^0x[0-9a-f]+$/);
    expect(result.status).toBe('confirmed');
    expect(result.blockNumber).toBeGreaterThan(0);
  });

  it('should verify blockchain token', async () => {
    const result = await service.blockchainVerifyToken('0xtest');
    expect(result).toBe(true);
  });

  it('should return mock Clever sync', async () => {
    const result = await service.cleverSync('district-1');
    expect(result.students.length).toBe(2);
    expect(result.teachers.length).toBe(1);
  });

  it('should return mock ClassLink sync', async () => {
    const result = await service.classLinkSync('org-1');
    expect(result.schools.length).toBe(1);
    expect(result.users.length).toBe(2);
  });

  it('should track call count', async () => {
    expect(service.getCallCount()).toBe(0);
    await service.openaiComplete('test');
    expect(service.getCallCount()).toBe(1);
    await service.emailSend('a@b.com', 's', 'b');
    expect(service.getCallCount()).toBe(2);
    service.resetCallCount();
    expect(service.getCallCount()).toBe(0);
  });

  it('should detect real mode when API key is set', () => {
    const cfg = new ConfigService({ OPENAI_API_KEY: 'sk-real-key' });
    const srv = new MockIntegrationService(cfg);
    expect(srv.isRealMode('openai')).toBe(true);
  });

  it('should return false for real mode when key is empty', () => {
    expect(service.isRealMode('openai')).toBe(false);
  });
});
