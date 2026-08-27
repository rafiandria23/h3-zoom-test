import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { FileModule } from '../file/file.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ItemController } from './item.controller';
import { ItemService } from './item.service';
import { ItemsProcessor } from './item.processor';

@Module({
  imports: [PrismaModule, FileModule, BullModule.registerQueue({ name: 'items' })],
  controllers: [ItemController],
  providers: [ItemService, ItemsProcessor],
})
export class ItemModule {}
