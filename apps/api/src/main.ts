import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  await app.register(multipart);

  const configService = app.get(ConfigService);

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
