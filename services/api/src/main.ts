import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as https from 'https';

async function bootstrap() {
  const tlsKeyPath = process.env.TLS_KEY;
  const tlsCertPath = process.env.TLS_CERT;
  const app = await NestFactory.create(AppModule);
  if (tlsKeyPath && tlsCertPath && fs.existsSync(tlsKeyPath) && fs.existsSync(tlsCertPath)) {
    const tlsOptions = {
      key: fs.readFileSync(tlsKeyPath),
      cert: fs.readFileSync(tlsCertPath),
    };
    const httpsServer = https.createServer(tlsOptions, app.getHttpAdapter().getInstance());
    await httpsServer.listen(3443);
  } else {
    await app.listen(3000);
  }
}
bootstrap();
