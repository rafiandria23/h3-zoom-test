import { Module } from '@nestjs/common';

import { FileService } from './file.service';
import { MultipartInterceptor } from './file.interceptor';

@Module({
  providers: [FileService, MultipartInterceptor],
  exports: [FileService, MultipartInterceptor],
})
export class FileModule {}
