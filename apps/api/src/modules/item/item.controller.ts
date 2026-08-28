import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Sse,
  UseInterceptors,
  type MessageEvent,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, concat, from, interval, map, mergeMap, tap } from 'rxjs';

import {
  ApiSuccessResponse,
  PaginationMetadataDto,
  SSE_HEARTBEAT_INTERVAL_MS,
} from '../common';
import { MultipartInterceptor } from '../file/file.interceptor';

import {
  ItemDto,
  ItemListEntryDto,
  ListItemsQueryDto,
  SubmitItemDto,
} from './item.dto';
import { ItemService } from './item.service';

@ApiTags('items')
@Controller('/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post('/')
  @UseInterceptors(MultipartInterceptor)
  @ApiOperation({
    summary: 'Submit an item for processing',
    description:
      'Persists the item, emits an `item_submitted` event, and enqueues it on the `items` queue.',
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({ type: SubmitItemDto })
  @ApiSuccessResponse(ItemDto, { description: 'The created item.' })
  submit(@Body() body: SubmitItemDto) {
    return this.itemService.submitItem(body);
  }

  @Get('/')
  @ApiOperation({ summary: 'List items with their processing status' })
  @ApiSuccessResponse(ItemListEntryDto, {
    isArray: true,
    metadata: PaginationMetadataDto,
    description:
      'A page of non-deleted items. `metadata.pagination.total` is the row count of the returned page.',
  })
  list(@Query() query: ListItemsQueryDto) {
    return this.itemService.listItems(query);
  }

  @ApiExcludeEndpoint()
  @Sse('/events')
  sseEvents(
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    let cursor = parseCursor(lastEventId);

    // Drain everything persisted past the current cursor, advancing it as we go.
    const drain = (): Observable<MessageEvent> =>
      from(this.itemService.iterateEventsSince(cursor)).pipe(
        tap((row) => {
          cursor = row.seq;
        }),
        map((row) => row.message),
      );

    // Replay the backlog, then re-drain on every cross-instance "processed"
    // notification. A tick that lands mid-drain is still covered by the next
    // one, since every query is `seq > cursor`.
    const stream = concat(
      drain(),
      this.itemService.processedEvents.pipe(mergeMap(() => drain())),
    );

    const heartbeat = interval(SSE_HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: {} })),
    );

    return new Observable<MessageEvent>((subscriber) => {
      const sub = stream.subscribe(subscriber);
      sub.add(heartbeat.subscribe((beat) => subscriber.next(beat)));
      return () => sub.unsubscribe();
    });
  }
}

function parseCursor(raw?: string): bigint | null {
  if (!raw) {
    return null;
  }

  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}
