import { Test } from '@nestjs/testing';

import { CommonService } from './common.service';

describe('CommonService', () => {
  let service: CommonService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [CommonService],
    }).compile();

    service = app.get<CommonService>(CommonService);
  });

  describe('successTimestamp', () => {
    it('wraps a partial payload with envelope defaults', () => {
      const result = service.successTimestamp({ data: { id: 1 } });

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.data).toEqual({ id: 1 });
      expect(result.metadata).toBeUndefined();
    });

    it('returns an empty envelope when called with no arguments', () => {
      const result = service.successTimestamp();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });
});
