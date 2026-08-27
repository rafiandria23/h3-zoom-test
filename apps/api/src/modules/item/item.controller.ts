import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';

import { MultipartInterceptor } from '../file/file.interceptor';

import { SubmitItemDto } from './item.dto';
import { ItemService } from './item.service';

@Controller('/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get('/')
  list() {
    return this.itemService.listItems();
  }

  @Post('/')
  @UseInterceptors(MultipartInterceptor)
  submit(@Body() body: SubmitItemDto) {
    return this.itemService.submitItem(body);
  }
}
