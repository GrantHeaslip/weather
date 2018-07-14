'use strict';

const env = process.env.APP_ENV || 'production';

module.exports = {
    canonicalHost: process.env.CANONICAL_HOST,
    canonicalProtocol: process.env.CANONICAL_PROTOCOL,
    cityWeatherDataBackgroundUpdateInterval: (
        parseInt(process.env.CITY_WEATHER_DATA_BACKGROUND_UPDATE_INTERVAL)
        || 1800000 // 30 minutes
    ),
    env: env,
    port: process.env.PORT || 5000,
    staticDir: env === 'development'
        ? 'static'
        : 'static', // TODO: 'static-build' once build set up
    workers: process.env.WEB_CONCURRENCY || 1,
};
