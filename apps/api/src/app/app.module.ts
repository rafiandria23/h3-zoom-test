import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CommonModule, envFilePaths, validateEnv } from '../modules/common';
import { apiConfig, dbConfig, redisConfig } from '../configs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '../modules/database/database.module';
import { ItemModule } from '../modules/item/item.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: envFilePaths,
      load: [apiConfig, dbConfig, redisConfig],
      validate: validateEnv,
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

    EventEmitterModule.forRoot(),

    CommonModule,
    DatabaseModule,
    ItemModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    },
    AppService,
  ],
})
export class AppModule {}
