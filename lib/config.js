'use strict';

const env =  process.env.APP_ENV || 'production';

module.exports = {
    canonicalHost: process.env.CANONICAL_HOST,
    canonicalProtocol: process.env.CANONICAL_PROTOCOL,
    env: env,
    port: process.env.PORT || 5000,
    staticDir: env === 'development'
        ? 'static'
        : 'static-build',
    workers: process.env.WEB_CONCURRENCY || 1,
};
