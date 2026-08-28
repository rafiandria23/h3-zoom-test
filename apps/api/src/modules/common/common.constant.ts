export const RADIX = 10;

// One page of the persisted event backlog replayed over SSE. The stream keeps
// fetching pages until everything past the client's cursor is drained, so this
// only bounds the size of a single fetch.
export const SSE_EVENT_REPLAY_PAGE_SIZE = 600;

// Interval between SSE keep-alive messages, so proxies don't reap idle streams.
export const SSE_HEARTBEAT_INTERVAL_MS = 30_000;

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum WebScheme {
  Http = 'http',
  Https = 'https',
}

export enum LogLevel {
  Trace = 'trace',
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Fatal = 'fatal',
}
