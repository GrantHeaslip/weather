'use strict';

const cityNamesBySlug = require('../config/cityNamesBySlug');
const climaconMappings = require('../config/climaconMappings');
const impliedPopConditions = require('../config/impliedPopConditions');
const getCanonicalUrl = require('./getCanonicalUrl');
const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');
const xml2jsParseString = require('xml2js').parseString;

const promisifiedXml2jsParseString = util.promisify(xml2jsParseString);

// This is necessary to deal with cases in which EC includes exceptional data
// e.g. "28 except 22 near Juan de Fuca Strait", "28 except 22 near the water"
const firstNumberRegExp = /([-]?\d+)/;

const temperatureRegExp = /^(.*)°C$/;

module.exports = getCityWeatherData;

async function getCityWeatherData(citySlug) {
    let atomDataUrl = (
        getCanonicalUrl(`/static/test-data/rss/city/${citySlug}_e.xml`)
    );

    let weatherAtomResponse;
    let weatherAtomText;
    let weatherAtomObject;
    let weatherData;

    try {
        weatherAtomResponse = await fetch(atomDataUrl);

        if (weatherAtomResponse.status !== 200) {
            logError(`Error while fetching weather Atom feed: Environment Canada URL returned status code ${weatherAtomResponse.status}`);
            return;
        }

        weatherAtomText = await weatherAtomResponse.text();
    } catch (error) {
        logError('Unknown error while fetching weather Atom feed', error);
        return;
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
        return;
    }

    return weatherData;
}

function getClimaconSrc(conditionDescription, isDay) {
    const lcConditionDescription = conditionDescription.toLowerCase();
    // const isDayEntry = entry.datetime.indexOf('night') !== -1;

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

    return null;
}

function logError(message, error) {
    let errorText = message;

    if (error !== null) {
        errorText += '\n' + String(error.stack);
    }

    console.error(errorText);
}

// First responder after successful AJAX request. Creates weather object with <entry>s and passes it to the HTML populator.
function processResponse(weatherAtomObject) {
    let weather = new Object();

    const entryElems = weatherAtomObject.feed.entry;
    const locationId = 'on-143';

    weather.locationName = cityNamesBySlug[locationId] || 'Unknown location';

    weather.forecasts = [];

    for (const entryElem of entryElems) {
        const entryTermAttr = entryElem.category[0].$.term;
        const entryTitleElemContent = entryElem.title[0]._;

        if (entryTermAttr === 'Current Conditions') {
            weather.current = parseCurrent(entryTitleElemContent.split(': ')[1]);
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
function parseCurrent(conditionsString) {
    var conditions = new Object();

    const segments = conditionsString.split(', ');

    for (var i = 0; i < segments.length; i++) {
        if (i == 0 && segments.length != 1) {
            conditions.description = segments[0];
        }
        if (temperatureRegExp.test(segments[i])) {
            conditions.temperature = parseInt(temperatureRegExp.exec(segments[i])[1]);
        }
    }

    if (conditions.description == undefined) {
        conditions.description = 'Normal';
    }

    conditions.climaconSrc = getClimaconSrc(conditions.description, true);

    return conditions;
}

// Takes an EC-provided forecast string and parses it into structured data
// Typical forecastString: "Friday night: Clear. Low 15."
function parseForecast(forecastString) {
    var forecast = new Object();
    forecast.climaconSrc = undefined;
    forecast.datetime = undefined;
    forecast.high = undefined;
    forecast.isDay = undefined;
    forecast.low = undefined;
    forecast.description = undefined;
    forecast.pop = undefined;

    // Typical forecastString: "Friday night: Clear. Low 15."
    var splitString = forecastString.split(': ');
    var conditions = splitString[1].split('. ');

    forecast.datetime = splitString[0];
    forecast.isDay = (forecast.datetime.indexOf('night') === -1);

    for (var i = 0; i < conditions.length; i++) {
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
            }
        }

        // AFAIK, conditions always include high or low, but never both
        else if (conditions[i].split('High ').length > 1) {
            forecast.high = tempStringToInt(conditions[i].split('High ')[1]);
        }
        else if (conditions[i].split('Low ').length > 1) {
            forecast.low = tempStringToInt(conditions[i].split('Low ')[1]);
        }

        // This is only included in EC data if there is any POP
        else if (conditions[i].split('POP ').length > 1) {
            var pop = conditions[i].split('POP ')[1];
            forecast.pop = parseInt(firstNumberRegExp.exec(pop)[0]);
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
