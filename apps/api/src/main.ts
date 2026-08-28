import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';

import { AppModule } from './app/app.module';
import { NodeEnv } from './modules/common';
import { buildOpenApiDocument } from './openapi';

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
    credentials: true,
    methods: ['HEAD', 'GET', 'POST'],
  });

  // Swagger UI at the root ('/'), outside the '/api/v1' prefix. Disabled in
  // production. The same document definition feeds the `openapi` target.
  if (process.env.NODE_ENV !== NodeEnv.Production) {
    SwaggerModule.setup('/', app, buildOpenApiDocument(app), {
      useGlobalPrefix: false,
    });
  }

  const apiHost = configService.get<string>('api.host') as string;
  const apiPort = configService.get<number>('api.port') as number;

  await app.listen(apiPort, apiHost);

  Logger.log(`🚀 H3 Zoom Test API is running on: http://${apiHost}:${apiPort}`);
}

bootstrap();
