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
    const lastUpdatedCitySlug = await (async function () {
        try {
            return await cityWeatherMetadataCachePolicy.get('last-updated-city-slug');
        } catch (error) {
            console.warn('Background update loop: Couldn’t read last updated city slug from Redis – starting loop from beginning.');
            return null;
        }
    })();

    let lastUpdatedCitySlugIndex = citySlugs.indexOf(lastUpdatedCitySlug);

    if (lastUpdatedCitySlugIndex === -1) {
        lastUpdatedCitySlugIndex = citySlugs.length - 1;

        try {
            await cityWeatherMetadataCachePolicy.set(
                'last-updated-city-slug',
                citySlugs[lastUpdatedCitySlugIndex]
            );
        } catch (error) {
            console.warn('Background update loop: Couldn’t write last updated city slug to Redis.');
        }

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
        try {
            await cityWeatherMetadataCachePolicy.set('last-updated-city-slug', citySlug);
        } catch (error) {
            console.warn('Background update loop: Couldn’t write last updated city slug to Redis.');
        }

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
            try {
                await cityWeatherDataCachePolicy.set(citySlug, cityWeatherData);
                console.info(`Updated ${citySlug} in background`);
            } catch (error) {
                console.warn(`Background update loop: Couldn’t write new ${citySlug} data to Redis.`);
            }
        }
    }
}
