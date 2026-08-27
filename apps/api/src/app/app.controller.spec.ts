import { Test, TestingModule } from '@nestjs/testing';

import { CommonService } from '../common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, CommonService],
    }).compile();
  });

  describe('getHealth', () => {
    it('returns the success envelope', () => {
      const appController = app.get<AppController>(AppController);
      const health = appController.getHealth();

      expect(health.success).toBe(true);
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });
});
