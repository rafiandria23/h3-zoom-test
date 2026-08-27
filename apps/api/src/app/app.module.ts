import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';

import {
  apiConfig,
  dbConfig,
  envFilePaths,
  redisConfig,
  validate,
} from './app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsProcessor } from './app.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: envFilePaths,
      load: [apiConfig, dbConfig, redisConfig],
      validate,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          db: config.get<number>('redis.dbIndex'),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'items' }),

    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, ItemsProcessor],
})
export class AppModule {}
