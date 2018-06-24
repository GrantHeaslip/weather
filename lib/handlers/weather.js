'use strict';

const utils = require('../utils');

let weatherDataCache = null;

module.exports = getWeatherHandler;

function getWeatherHandler(server) {
    return async function(request, h) {
        if (weatherDataCache === null) {
            weatherDataCache = provisionWeatherDataCache(server);
        }

        const citySlug = request.params.citySlug;

        const cityWeatherData = await weatherDataCache.get(citySlug);

        return h.view(
            'weather',
            {
                data: cityWeatherData,
            },
        );
    };
}

function provisionWeatherDataCache(server) {
    return server.cache({
        cache: 'redis',
        expiresIn: 20 * 60 * 1000, // 20 minutes
        generateFunc: utils.getCityWeatherData,
        generateTimeout: 5 * 1000, // 5 seconds
        // staleIn: 15 * 60 * 1000, // 15 minutes
        staleIn: 1, // 1 millisecond (for debugging)
        staleTimeout: 3000, // 3 seconds
        segment: 'weather-data',
    });
}
