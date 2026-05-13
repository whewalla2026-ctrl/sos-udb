import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedactingLogger } from './shared/redacting-logger';
import { initNestTracing } from './tracing';
import helmet from 'helmet';

async function bootstrap() {
  initNestTracing();
  const logger = new RedactingLogger('UDB-API');
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableShutdownHooks();

  // Security headers
  app.use(helmet());

  app.enableCors({
    origin: [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000',
      'http://localhost:4000',
    ],
    credentials: true,
    exposedHeaders: ['Set-Cookie'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 UDB API running on http://localhost:${port}/graphql`);

  // Graceful shutdown for Docker SIGTERM
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  }
}

bootstrap();
