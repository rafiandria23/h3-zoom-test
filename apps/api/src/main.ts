import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app/app.module';
import { CaseConversionInterceptor } from './app/app.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);

  // snake_case wire contract <-> camelCase runtime: keys are converted here,
  // enum values via @Transform on the DTOs.
  app.useGlobalInterceptors(new CaseConversionInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );

  app.setGlobalPrefix('/api/v1');
  app.enableCors({
    origin: configService.get<string>('api.webUrl'),
    methods: ['HEAD', 'GET', 'POST'],
  });

  const apiHost = configService.get<string>('api.host') as string;
  const apiPort = configService.get<number>('api.port') as number;

  await app.listen(apiPort, apiHost);

  Logger.log(`🚀 H3 Zoom Test API is running on: http://${apiHost}:${apiPort}`);
}

bootstrap();
