'use strict';

const cityNamesBySlug = require('../config/cityNamesBySlug');
const displayConfig = require('../config/display');
const utils = require('../utils');

module.exports = getWeatherHandler;

function getWeatherHandler(server) {
    const cityWeatherDataCachePolicy = utils.getCityWeatherDataCachePolicy(server);

    return async function(request, h) {
        const citySlug = request.params.citySlug;
        const cityWeatherData = await cityWeatherDataCachePolicy.get(citySlug);

        if (cityWeatherData === null) {
            return h.view('error').code(500);
        }

        return h.view(
            'weather',
            {
                cityNamesBySlug,
                currentCitySlug: citySlug,
                currentConditions: cityWeatherData.currentConditions,
                forecasts: cityWeatherData.forecasts,
                popForegroundColorInvertThreshold: displayConfig.popForegroundColorInvertThreshold,
                temperatureForegroundColorInvertThreshold: displayConfig.temperatureForegroundColorInvertThreshold,
            },
        );
    };
}
