import { Injectable } from '@nestjs/common';

import { CommonService, type SuccessTimestampDto } from '../modules/common';

@Injectable()
export class AppService {
  constructor(private readonly commonService: CommonService) {}

  public getHealth(): SuccessTimestampDto {
    return this.commonService.successTimestamp();
  }
}
