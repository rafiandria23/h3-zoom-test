import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Sse,
  UseInterceptors,
  type MessageEvent,
} from '@nestjs/common';
import { Observable, concat, from, interval, map, mergeMap, tap } from 'rxjs';

import { SSE_HEARTBEAT_INTERVAL_MS } from '../common';
import { MultipartInterceptor } from '../file/file.interceptor';

import { SubmitItemDto } from './item.dto';
import { ItemService } from './item.service';

@Controller('/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post('/')
  @UseInterceptors(MultipartInterceptor)
  submit(@Body() body: SubmitItemDto) {
    return this.itemService.submitItem(body);
  }

  @Get('/')
  list() {
    return this.itemService.listItems();
  }

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
