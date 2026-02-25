import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL;
  const port = Number(process.env.PORT ?? 3001);

  if (isProd && !frontendUrl) {
    throw new Error('FRONTEND_URL es obligatorio en produccion');
  }

  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(cookieParser());
  
  app.enableCors({
    origin: frontendUrl || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'idempotency-key'],
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
}

bootstrap();

