import { Test } from '@nestjs/testing';

import { CommonService } from '../modules/common';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService, CommonService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('returns the success envelope with a timestamp and no data', () => {
      const health = service.getHealth();

      expect(health.success).toBe(true);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.data).toBeUndefined();
    });
  });
});
