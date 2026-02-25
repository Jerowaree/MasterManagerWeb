import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? frontendUrl ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const port = Number(process.env.PORT ?? 3001);

  if (isProd && !frontendUrl) {
    throw new Error('FRONTEND_URL es obligatorio en produccion');
  }

  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');

  if ((process.env.TRUST_PROXY ?? '').toLowerCase() === 'true') {
    expressApp.set('trust proxy', 1);
  }

  // Security
  app.use(
    helmet({
      hsts: isProd
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );
  app.use(cookieParser());
  
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS'));
    },
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

