'use strict';

const getCityWeatherData = require('../utils/getCityWeatherData');

let cityWeatherDataCachePolicy = null;

module.exports = getCityWeatherDataCachePolicy;

function getCityWeatherDataCachePolicy(server) {
    if (cityWeatherDataCachePolicy === null) {
        cityWeatherDataCachePolicy = server.cache({
            cache: 'redis',
            expiresIn: 20 * 60 * 1000, // 20 minutes
            generateFunc: getCityWeatherData,
            generateTimeout: 5 * 1000, // 5 seconds
            staleIn: 15 * 60 * 1000, // 15 minutes
            // staleIn: 1, // 1 millisecond (for debugging)
            staleTimeout: 3000, // 3 seconds
            segment: 'city-weather-data',
        });
    }

    return cityWeatherDataCachePolicy;
}
