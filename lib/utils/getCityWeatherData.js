'use strict';

const getCanonicalUrl = require('./getCanonicalUrl');
const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');
const xml2jsParseString = require('xml2js').parseString;

const promisifiedXml2jsParseString = util.promisify(xml2jsParseString);

const climaconMappings = {
    "a few clouds": 						["Cloud-Sun", "Cloud-Moon"],
    "a few showers": 						["Cloud-Drizzle-Sun", "Cloud-Drizzle-Moon"],
    "a few showers or drizzle": 			["Cloud-Drizzle-Sun", "Cloud-Drizzle-Moon"],
    "a few showers or thunderstorms": 		["Cloud-Lightning-Sun", "Cloud-Lightning-Moon"],
    "a few thunderstorms": 					["Cloud-Lightning-Sun", "Cloud-Lightning-Moon"],
    "a mix of sun and cloud": 				"Cloud-Sun",
    "chance of flurries": 					["Cloud-Snow-Sun-Alt", "Cloud-Snow-Moon-Alt"],
    "chance of showers": 					["Cloud-Drizzle-Sun", "Cloud-Drizzle-Moon"],
    "chance of showers or drizzle": 		["Cloud-Drizzle-Sun", "Cloud-Drizzle-Moon"],
    "chance of thunderstorms": 				["Cloud-Lightning-Sun", "Cloud-Lightning-Moon"],
    "chance of showers or thunderstorms": 	["Cloud-Lightning-Sun", "Cloud-Lightning-Moon"],
    "clear": 								["Sun", "Moon"],
    "clearing": 							["Cloud-Sun", "Cloud-Moon"],
    "cloudy": 								"Cloud",
    "cloudy periods": 						["Cloud-Sun", "Cloud-Moon"],
    "increasing cloudiness": 				"Cloud",
    "light rain": 							"Cloud-Drizzle-Alt",
    "light rainshower": 					"Cloud-Drizzle-Alt",
    "mainly clear": 						["Cloud-Sun", "Cloud-Moon"],
    "mainly cloudy": 						"Cloud",
    "mainly sunny": 						"Sun",
    "mostly cloudy": 						"Cloud",
    "normal": 								["Cloud-Sun", "Cloud-Moon"],
    "partly cloudy": 						["Cloud-Sun", "Cloud-Moon"],
    "periods of drizzle": 					["Cloud-Drizzle-Sun-Alt", "Cloud-Drizzle-Moon-Alt"],
    "periods of rain": 						["Cloud-Drizzle-Sun", "Cloud-Drizzle-Moon"],
    "periods of snow": 						["Cloud-Snow-Sun-Alt", "Cloud-Snow-Moon-Alt"],
    "rain": 								"Cloud-Rain",
    "showers": 								"Cloud-Drizzle",
    "showers or drizzle": 					"Cloud-Drizzle",
    "sunny": 								"Sun",
    "thunderstorm with light rainshowers": 	"Cloud-Lightning",
};

const locationMappings = {
    "ab-52": 	"Calgary, AB",
    "pe-5": 	"Charlottetown, PE",
    "ab-50": 	"Edmonton, AB",
    "nb-29": 	"Fredericton, NB",
    "ns-19": 	"Halifax, NS",
    "nu-21": 	"Iqaluit, NU",
    "qc-147": 	"Montréal, QC",
    "on-118": 	"Ottawa, ON",
    "bc-79": 	"Prince George, BC",
    "qc-133": 	"Québec, QC",
    "sk-32": 	"Regina, SK",
    "sk-40": 	"Saskatoon, SK",
    "nl-24": 	"St. John’s, NL",
    "on-100": 	"Thunder Bay, ON",
    "on-143": 	"Toronto, ON",
    "bc-74": 	"Vancouver, BC",
    "bc-85": 	"Victoria, BC",
    "yt-16": 	"Whitehorse, YT",
    "mb-38": 	"Winnipeg, MB",
    "nt-24": 	"Yellowknife, NT",
};

const impliedPOPConditions = [
    "Periods of light snow or rain",
    "Periods of rain",
    "Rain",
    "Rain or snow",
    "Showers",
];

// This is necessary to deal with cases in which EC includes exceptional data
// e.g. "28 except 22 near Juan de Fuca Strait", "28 except 22 near the water"
var firstNumberRegExp = /([-]?\d+)/;

module.exports = getCityWeatherData;

async function getCityWeatherData(cityCode) {
    let atomDataUrl = getCanonicalUrl('/static/test-data/rss/city/on-143_e.xml');

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
    const locationID = 'on-143';

    weather.location = locationMappings[locationID];
    if (weather.location == undefined) {
        weather.location = "unknown location";
    }

    weather.forecasts = [];

    for (const entryElem of entryElems) {
        const entryTermAttr = entryElem.category[0].$.term;
        const entryTitleElemContent = entryElem.title[0]._;

        if (entryTermAttr === 'Warnings and Watches') {
            weather.warnings = new Object();
            weather.warnings.text = entryTitleElemContent;
        }
        else if (entryTermAttr === 'Current Conditions') {
            weather.current = new Object();
            weather.current = parseCurrent(entryTitleElemContent.split(": ")[1]);
        }
        else if (entryTermAttr === 'Weather Forecasts') {
            var forecast = parseForecast(entryTitleElemContent);
            weather.forecasts.push(forecast);
        }
    }

    return weather;
}

// Takes an EC-provided current conditons string and parses it into structured data
// Typical conditionsString: "Mostly Cloudy, 27.1°C"
function parseCurrent(conditionsString) {
    var conditions = new Object();

    var segments = conditionsString.split(", ");
    var tempRegExp = new RegExp("^(.*)°C$");

    for (var i = 0; i < segments.length; i++) {
        if (i == 0 && segments.length != 1) {
            conditions.description = segments[0];
        }
        if (tempRegExp.test(segments[i])) {
            conditions.temp = tempRegExp.exec(segments[i])[1];
        }
    }

    if (conditions.description == undefined) {
        conditions.description = "Normal"
    }

    return conditions;
}

// Takes an EC-provided forecast string and parses it into structured data
// Typical forecastString: "Friday night: Clear. Low 15."
function parseForecast(forecastString) {
    var forecast = new Object();
    forecast.datetime = undefined;
    forecast.high = undefined;
    forecast.low = undefined;
    forecast.description = undefined;
    forecast.pop = undefined;

    // Typical forecastString: "Friday night: Clear. Low 15."
    var splitString = forecastString.split(": ");
    var conditions = splitString[1].split(". ");

    forecast.datetime = splitString[0];

    for (var i = 0; i < conditions.length; i++) {
        // Removes leftover period from the end of the last condition
        if (i == conditions.length - 1) {
            conditions[i] = conditions[i].split(".")[0];
        }

        // First segment is always description
        if (i == 0) {
            forecast.description = conditions[i];
            if (impliedPOPConditions.indexOf(forecast.description) != -1) {
                forecast.pop = 100;
            }
        }

        // AFAIK, conditions always include high or low, but never both
        else if (conditions[i].split("High ").length > 1) {
            forecast.high = tempStringToInt(conditions[i].split("High ")[1]);
        }
        else if (conditions[i].split("Low ").length > 1) {
            forecast.low = tempStringToInt(conditions[i].split("Low ")[1]);
        }

        // This is only included in EC data if there is any POP
        else if (conditions[i].split("POP ").length > 1) {
            var pop = conditions[i].split("POP ")[1];
            forecast.pop = parseInt(firstNumberRegExp.exec(pop)[0]);
        }
    }

    return forecast;
}

// Takes a temperature string, sanitizes the EC cruft, and returns an integer
function tempStringToInt(tempString) {
    tempString = tempString.replace("plus ", "").replace("minus ", "-").replace("zero", "0");
    tempString = firstNumberRegExp.exec(tempString);
    return parseInt(tempString);
}
