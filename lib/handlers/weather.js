'use strict';

const utils = require('../utils');

let weatherDataCache = null;

const provisionWeatherDataCache = (server) => {
    return server.cache({
        cache: 'redis',
        expiresIn: 20 * 60 * 1000, // 20 minutes
        generateFunc: utils.getCityWeatherData,
        generateTimeout: 5 * 1000, // 5 seconds
        staleIn: 15 * 60 * 1000, // 15 minutes
        staleTimeout: 3000, // 3 seconds
        segment: 'weather-data',
    });
};

module.exports = (server) => {
    return async (request, h) => {
        if (weatherDataCache === null) {
            weatherDataCache = provisionWeatherDataCache(server);
        }

        const cityCode = 'on-143';

        const cityWeatherData = await weatherDataCache.get(cityCode);

        return h.view(
            'weather',
            {},
        );
    };
};
