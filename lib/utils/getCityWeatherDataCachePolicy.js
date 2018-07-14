'use strict';

module.exports = getCityWeatherDataCachePolicy;

const config = require('../config');
const getCityWeatherData = require('../utils/getCityWeatherData');

let cityWeatherDataCachePolicy = null;

const second = 1000;

function getCityWeatherDataCachePolicy(server) {
    if (cityWeatherDataCachePolicy === null) {
        cityWeatherDataCachePolicy = server.cache({
            cache: 'redis',
            expiresIn: (
                config.cityWeatherDataBackgroundUpdateInterval * 2
            ),
            generateFunc: getCityWeatherData,
            generateTimeout: 5 * second,
            staleIn:(
                config.cityWeatherDataBackgroundUpdateInterval * 1.5
            ),
            staleTimeout: 3 * second,
            segment: 'city-weather-data',
        });
    }

    return cityWeatherDataCachePolicy;
}
