'use strict';

module.exports = startCityWeatherDataBackgroundUpdateLoop;

const cityNamesBySlug = require('../config/cityNamesBySlug');
const config = require('../config');
const getCityWeatherData = require('../utils/getCityWeatherData');
const getCityWeatherDataCachePolicy = require('../utils/getCityWeatherDataCachePolicy');

async function startCityWeatherDataBackgroundUpdateLoop(server) {
    // ==============
    // === Set up ===
    // ==============
    const citySlugs = Object.keys(cityNamesBySlug);
    const cityWeatherDataCachePolicy = (
        getCityWeatherDataCachePolicy(server)
    );
    const cityWeatherMetadataCachePolicy = server.cache({
        cache: 'redis',
        expiresIn: 24 * 60 * 60 * 1000, // 24 hours
        segment: 'city-weather-metadata',
    });
    const updateInterval = (
        config.cityWeatherDataBackgroundUpdateInterval / citySlugs.length
    );

    // ===================================
    // === Determine last updated city ===
    // ===================================
    const lastUpdatedCitySlug = await cityWeatherMetadataCachePolicy.get('last-updated-city-slug');
    let lastUpdatedCitySlugIndex = citySlugs.indexOf(lastUpdatedCitySlug);

    if (lastUpdatedCitySlugIndex === -1) {
        lastUpdatedCitySlugIndex = citySlugs.length - 1;

        cityWeatherMetadataCachePolicy.set(
            'last-updated-city-slug',
            citySlugs[lastUpdatedCitySlugIndex]
        );
    }

    // ==================
    // === Start loop ===
    // ==================
    setInterval(intervalHandler, updateInterval);

    async function intervalHandler() {
        // -------------------------------
        // -- Determine city to update ---
        // -------------------------------
        // (Returns to zero if at end of citySlugs)
        const citySlugIndexToUpdate = (
            typeof citySlugs[lastUpdatedCitySlugIndex + 1] !== 'undefined'
                ? lastUpdatedCitySlugIndex + 1
                : 0
        );

        const citySlug = citySlugs[citySlugIndexToUpdate];

        // --------------------------------------
        // --- Update background update state ---
        // --------------------------------------
        // (Immediately update in case next interval triggers before this one is
        // done.)
        lastUpdatedCitySlugIndex = citySlugIndexToUpdate;
        cityWeatherMetadataCachePolicy.set('last-updated-city-slug', citySlug);

        // ------------------------------------------------
        // --- Get city weather data and write to Redis ---
        // ------------------------------------------------
        const cityWeatherData = await getCityWeatherData(
            citySlug,
            {
                ttl: 0,
                isRunningInBackground: true,
            }
        );

        if (cityWeatherData === null) {
            console.error(`Error while updating ${citySlug} in background`);
        } else {
            cityWeatherDataCachePolicy.set(citySlug, cityWeatherData);

            console.info(`Updated ${citySlug} in background`);
        }
    }
}
