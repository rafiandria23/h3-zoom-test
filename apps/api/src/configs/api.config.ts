import _ from 'lodash';
import { registerAs } from '@nestjs/config';

import { RADIX } from '../modules/common/common.constant';

export const apiConfig = registerAs('api', () => {
  const host = _.get(process, 'env.API_HOST', '127.0.0.1');

  const port = Number.parseInt(_.get(process, 'env.API_PORT', '3000'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid API_PORT');
  }

  const webScheme = _.get(process, 'env.WEB_SCHEME', 'http');

  const webHost = _.get(process, 'env.WEB_HOST', '127.0.0.1');

  const webPort = Number.parseInt(_.get(process, 'env.WEB_PORT', '4000'), RADIX);
  if (Number.isNaN(webPort)) {
    throw new TypeError('Invalid WEB_PORT');
  }

  const webUrl = `${webScheme}://${webHost}:${webPort}`;

  return {
    host,
    port,
    webScheme,
    webHost,
    webPort,
    webUrl,
  };
});
