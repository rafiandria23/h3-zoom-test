import _ from 'lodash';
import { registerAs } from '@nestjs/config';

import { RADIX } from '../modules/common/common.constant';

export const dbConfig = registerAs('db', () => {
  const host = _.get(process, 'env.DB_HOST', '127.0.0.1');
  const port = Number.parseInt(_.get(process, 'env.DB_PORT', '5432'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid DB_PORT');
  }

  const user = _.get(process, 'env.DB_USER', 'rafiandria23');
  const password = _.get(process, 'env.DB_PASSWORD', 'rafiandria23');
  const name = _.get(process, 'env.DB_NAME', 'h3_zoom_test');

  return {
    host,
    port,
    user,
    password,
    name,
  };
});
