import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../prisma/client/client';

// Prisma 7's generated client ships no query engine, so a driver adapter is
// required. Built here as a free function because `super()` must be the first
// statement in the constructor (parameter properties => TS2376).
function createPrismaAdapter(config: ConfigService): PrismaPg {
  const user = config.getOrThrow<string>('db.user');
  const password = config.getOrThrow<string>('db.password');
  const host = config.getOrThrow<string>('db.host');
  const port = config.getOrThrow<number>('db.port');
  const name = config.getOrThrow<string>('db.name');

  const connectionString =
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(name)}?schema=public`;

  return new PrismaPg({ connectionString });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({ adapter: createPrismaAdapter(config) });
  }

  public async onModuleInit() {
    await this.$connect();
  }

  public async onModuleDestroy() {
    await this.$disconnect();
  }
}
