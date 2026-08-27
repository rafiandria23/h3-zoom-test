import { Injectable } from '@nestjs/common';

import { SuccessTimestampDto } from './common.dto';

@Injectable()
export class CommonService {
  /**
   * Wraps a payload in the default success envelope, filling in `success` and
   * `timestamp` defaults for anything left unset in `partial`.
   */
  public successTimestamp<MD = unknown, D = unknown>(
    partial: Partial<SuccessTimestampDto<MD, D>> = {},
  ): SuccessTimestampDto<MD, D> {
    return new SuccessTimestampDto<MD, D>(partial);
  }
}
