'use strict';

const climaconMappings = require('../config/climaconMappings');
const displayConfig = require('../config/display');
const impliedPopConditions = require('../config/impliedPopConditions');
const getPopBackgroundCssColor = require('./getPopBackgroundCssColor');
const getTemperatureBackgroundCssColor = require('./getTemperatureBackgroundCssColor');
const fetch = require('node-fetch');
const popForegroundColorInvertThreshold = (
    displayConfig.popForegroundColorInvertThreshold
);
const temperatureForegroundColorInvertThreshold = (
    displayConfig.temperatureForegroundColorInvertThreshold
);
const util = require('util');
const xml2jsParseString = require('xml2js').parseString;

const promisifiedXml2jsParseString = util.promisify(xml2jsParseString);

// This is necessary to deal with cases in which EC includes exceptional data
// e.g. "28 except 22 near Juan de Fuca Strait", "28 except 22 near the water"
const firstNumberRegExp = /([-]?\d+)/;

const temperatureRegExp = /^(.*)°C$/;

module.exports = getCityWeatherData;

async function getCityWeatherData(citySlug, flags = {}) {
    if (flags.isRunningInBackground !== true) {
        console.warn(`Updating stale ${citySlug} in request handler!`);
    }

    const atomDataUrl = `https://weather.gc.ca/rss/city/${citySlug}_e.xml`;

    let weatherData;
    let weatherAtomObject;
    let weatherAtomResponse;
    let weatherAtomText;

    try {
        weatherAtomResponse = await fetch(atomDataUrl);

        if (weatherAtomResponse.status !== 200) {
            logError(`Error while fetching weather Atom feed at ${atomDataUrl}: Environment Canada URL returned status code ${weatherAtomResponse.status}`);
            return null;
        }

        weatherAtomText = await weatherAtomResponse.text();
    } catch (error) {
        logError('Unknown error while fetching weather Atom feed', error);
        return null;
    }

    try {
        weatherAtomObject = await promisifiedXml2jsParseString(
            weatherAtomText,
            {
                explicitCharkey: true,
                trim: true,
            }
        );

        weatherData = processResponse(weatherAtomObject);
    } catch (error) {
        logError('Unknown error while parsing weather Atom feed', error);
        return null;
    }

    return weatherData;
}

function getClimaconSrc(conditionDescription, isDay) {
    const lcConditionDescription = conditionDescription.toLowerCase();

    if (Array.isArray(climaconMappings[lcConditionDescription])) {
        if (
            climaconMappings[lcConditionDescription].length === 1 ||
            (
                climaconMappings[lcConditionDescription].length === 2 &&
                isDay === true
            )
        ) {
            return `climacons/${climaconMappings[lcConditionDescription][0]}.svg`;
        } else if (
            climaconMappings[lcConditionDescription].length === 2 &&
            isDay === false
        ) {
            return `climacons/${climaconMappings[lcConditionDescription][1]}.svg`;
        }
    }

    console.warn(`Missing Climacon for condition “${conditionDescription}”`);

    return 'climacons/Thermometer-50.svg';
}

function logError(message, error = null) {
    let errorText = message;

    if (error !== null) {
        errorText += '\n' + String(error.stack);
    }

    console.error(errorText);
}

function processResponse(weatherAtomObject) {
    let weather = {
        currentConditions: undefined,
        forecasts: [],
    };

    for (const entryElem of weatherAtomObject.feed.entry) {
        const entryTermAttr = entryElem.category[0].$.term;
        const entryTitleElemContent = entryElem.title[0]._;

        if (entryTermAttr === 'Current Conditions') {
            weather.currentConditions = (
                parseCurrentConditions(entryTitleElemContent.split(': ')[1])
            );
        } else if (entryTermAttr === 'Weather Forecasts') {
            weather.forecasts.push(
                parseForecast(entryTitleElemContent)
            );
        }
    }

    return weather;
}

// Takes an EC-provided current conditons string and parses it into structured data
// Typical conditionsString: "Mostly Cloudy, 27.1°C"
function parseCurrentConditions(currentConditionsString) {
    let currentConditions = {
        climaconSrc: undefined,
        description: undefined,
        temperature: undefined,
        temperatureBackgroundCssColor: undefined,
        temperatureBackgroundIsDark: undefined,
    };

    const segments = currentConditionsString.split(', ');

    for (var i = 0; i < segments.length; i++) {
        if (i == 0 && segments.length != 1) {
            currentConditions.description = segments[0];
        }
        if (temperatureRegExp.test(segments[i])) {
            currentConditions.temperature = (
                parseInt(temperatureRegExp.exec(segments[i])[1])
            );
            currentConditions.temperatureBackgroundCssColor = (
                getTemperatureBackgroundCssColor(currentConditions.temperature)
            );
            currentConditions.temperatureBackgroundIsDark = (
                Math.abs(currentConditions.temperature) > temperatureForegroundColorInvertThreshold
            );
        }
    }

    if (currentConditions.description == undefined) {
        currentConditions.description = 'Normal';
    }

    currentConditions.climaconSrc = getClimaconSrc(currentConditions.description, true);

    return currentConditions;
}

// Takes an EC-provided forecast string and parses it into structured data
// Typical forecastString: "Friday night: Clear. Low 15."
function parseForecast(forecastString) {
    let forecast = {
        climaconSrc: undefined,
        datetime: undefined,
        high: undefined,
        isDay: undefined,
        low: undefined,
        description: undefined,
        pop: undefined,
        popBackgroundCssColor: undefined,
        popBackgroundIsDark: undefined,
        temperatureBackgroundCssColor: undefined,
        temperatureBackgroundIsDark: undefined,
    };

    // Typical forecastString: "Friday night: Clear. Low 15."
    const splitString = forecastString.split(': ');
    let conditions = splitString[1].split('. ');

    forecast.datetime = splitString[0];
    forecast.isDay = (forecast.datetime.indexOf('night') === -1);

    for (let i = 0; i < conditions.length; i++) {
        // Removes leftover period from the end of the last condition
        if (i == conditions.length - 1) {
            conditions[i] = conditions[i].split('.')[0];
        }

        // First segment is always description
        if (i == 0) {
            forecast.description = conditions[i];
            forecast.climaconSrc = getClimaconSrc(
                forecast.description,
                forecast.isDay
            );
            if (impliedPopConditions.indexOf(forecast.description.toLowerCase()) != -1) {
                forecast.pop = 100;
                forecast.popBackgroundCssColor = (
                    getPopBackgroundCssColor(forecast.pop)
                );
                forecast.popBackgroundIsDark = (
                    Math.abs(forecast.pop) > popForegroundColorInvertThreshold
                );
            }

            continue;
        }
        // AFAIK, conditions always include high or low, but never both
        if (conditions[i].split('Low ').length > 1) {
            forecast.low = tempStringToInt(conditions[i].split('Low ')[1]);
            forecast.temperatureBackgroundCssColor = (
                getTemperatureBackgroundCssColor(forecast.low)
            );
            forecast.temperatureBackgroundIsDark = (
                Math.abs(forecast.low) > temperatureForegroundColorInvertThreshold
            );

            continue;
        }

        if (conditions[i].split('High ').length > 1) {
            forecast.high = tempStringToInt(conditions[i].split('High ')[1]);
            forecast.temperatureBackgroundCssColor = (
                getTemperatureBackgroundCssColor(forecast.high)
            );
            forecast.temperatureBackgroundIsDark = (
                Math.abs(forecast.high) > temperatureForegroundColorInvertThreshold
            );

            continue;
        }

        // This is only included in EC data if there is any POP
        if (conditions[i].split('POP ').length > 1) {
            const pop = conditions[i].split('POP ')[1];
            forecast.pop = parseInt(firstNumberRegExp.exec(pop)[0]);
            forecast.popBackgroundCssColor = (
                getPopBackgroundCssColor(forecast.pop)
            );
            forecast.popBackgroundIsDark = (
                Math.abs(forecast.pop) > popForegroundColorInvertThreshold
            );

            continue;
        }
    }

    return forecast;
}

// Takes a temperature string, sanitizes the EC cruft, and returns an integer
function tempStringToInt(tempString) {
    tempString = tempString
        .replace('plus ', '')
        .replace('minus ', '-')
        .replace('zero', '0');
    tempString = firstNumberRegExp.exec(tempString);
    return parseInt(tempString);
}
