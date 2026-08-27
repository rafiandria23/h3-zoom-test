import _ from 'lodash';
import { registerAs } from '@nestjs/config';

import { RADIX } from '../common/common.constant';

export const apiConfig = registerAs('api', () => {
  const host = _.get(process, 'env.API_HOST', '127.0.0.1');

  const port = Number.parseInt(_.get(process, 'env.API_PORT', '3000'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid API_PORT');
  }

  const webUrl = _.get(process, 'env.WEB_URL', 'http://127.0.0.1:4000');

  return {
    host,
    port,
    webUrl,
  };
});
