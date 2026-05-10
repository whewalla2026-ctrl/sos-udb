import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedactingLogger } from './shared/redacting-logger';
import { initNestTracing } from './tracing';

async function bootstrap() {
  initNestTracing();
  const logger = new RedactingLogger('UDB-API');
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableCors({
    origin: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
    credentials: true,
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
}

bootstrap();
