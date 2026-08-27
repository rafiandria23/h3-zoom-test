import _ from 'lodash';
import { registerAs } from '@nestjs/config';

import { RADIX } from '../modules/common/common.constant';

export const redisConfig = registerAs('redis', () => {
  const host = _.get(process, 'env.REDIS_HOST', '127.0.0.1');
  const port = Number.parseInt(_.get(process, 'env.REDIS_PORT', '6379'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid REDIS_PORT');
  }

  const user = _.get(process, 'env.REDIS_USER', 'rafiandria23');
  const password = _.get(process, 'env.REDIS_PASSWORD', 'rafiandria23');
  const dbIndex = Number.parseInt(
    _.get(process, 'env.REDIS_DB_INDEX', '0'),
    RADIX,
  );
  if (Number.isNaN(dbIndex)) {
    throw new TypeError('Invalid REDIS_DB_INDEX');
  }

  return {
    host,
    port,
    user,
    password,
    dbIndex,
  };
});
