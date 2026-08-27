import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { keysToCamel, keysToSnake } from './app.util';

/**
 * Bridges the snake_case wire contract to the camelCase runtime.
 *
 * The pre-handler phase runs before pipes, so request keys are camelCased
 * before `ValidationPipe` binds them to DTOs; response keys are snake_cased
 * on the way out. Only plain-object keys are touched — enum *values* are
 * field-scoped and handled with `@Transform` on the DTOs.
 */
@Injectable()
export class CaseConversionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (request.body && typeof request.body === 'object') {
      request.body = keysToCamel(request.body);
    }

    if (request.query && typeof request.query === 'object') {
      (request as { query: unknown }).query = keysToCamel(request.query);
    }

    return next.handle().pipe(map((data) => keysToSnake(data)));
  }
}
