import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

// Single definition of the OpenAPI document. Consumed by the headless `openapi`
// target (openapi.script.ts) that emits openapi.json for `libs/api-client`
// codegen, and — later — by the runtime Swagger UI in main.ts.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('H3 Zoom Test API')
    .setDescription('Item submission and asynchronous processing API.')
    .setVersion('1.0.0')
    .build();

  return SwaggerModule.createDocument(app, config);
}
