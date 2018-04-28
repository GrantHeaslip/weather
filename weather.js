climaconMappings = {
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

locationMappings = {
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

impliedPOPConditions = [
	"Periods of light snow or rain",
	"Periods of rain",
	"Rain",
	"Rain or snow",
	"Showers",
];

fillerText = "";
redBase = 255;
blueBase = 255;
highCap = 40;
lowCap = -40;
colorInvertThreshold = 25;

// Runs on load. Queries YQL for Environment Canada data. Passes data to processResponse or displays error message.
window.onload = function() {
	locationID = getParameterByName("id");

    populateSelect();

    if (locationID != "") {
    	var query = "http://query.yahooapis.com/v1/public/yql?q=select * from xml where url='http://weather.gc.ca/rss/city/" + locationID + "_e.xml'&format=json";

		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState == XMLHttpRequest.DONE ) {
				if(request.status == 200){
					data = JSON.parse(request.responseText);
					if (data.query.results.html == undefined) {
						dataEntries = data.query.results.feed.entry;
						processResponse(dataEntries);
					}
					else {
						populateError("No such location");
					} 
					
				}
				else {
					populateError("Server error");
				}
			}
		}
		request.open("GET", query, true);
		request.send();
	} else {
		redirectToLocationByID("on-143");
	}

	// After 2 seconds, display a loading message
	window.setTimeout(function() {
		if (document.querySelector("#current .temp").innerHTML == "") {
			document.querySelector("#current .temp").innerHTML = "Waiting…";
		}
	}, 2000);

	// After 10 seconds, display an additional loading message
	window.setTimeout(function() {
		if (document.querySelector("#current .description").innerHTML == "") {
			if (typeof(weather) != "undefined") {
				populateError("Processing error");
			} else {
				populateError("Server hasn’t responded");
			}
			
		}
	}, 10000);
}

function redirectToLocationByID(locationID) {
	window.location.replace(window.location.pathname + "?id=" + locationID);
}

// Third-party funciton to get query string parameter by name
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Takes a temperature string, sanitizes the EC cruft, and returns an integer
function tempStringToInt(tempString) {
	// This is necessary to deal with cases in which EC includes exceptional data
	// e.g. "28 except 22 near Juan de Fuca Strait", "28 except 22 near the water"
	firstNumberRegExp = /([-]?\d+)/;

	tempString = tempString.replace("plus ", "").replace("minus ", "-").replace("zero", "0");
	tempString = firstNumberRegExp.exec(tempString);
	return parseInt(tempString);
}

// Returns a climacon src string given an entry
// When an icon contains a sun/moon, returns the time-appropriate version
function getClimaconSrc(entry) {
	if (entry.datetime == undefined) {
		var dayNightInt = 0;
	}
	else if (entry.datetime.indexOf("night") != -1) {
		var dayNightInt = 1;
	}
	else {
		var dayNightInt = 0;
	}

	var description = entry.description.toLowerCase();
	if (typeof(climaconMappings[description]) == "object") {
		return "climacons/" + climaconMappings[description][dayNightInt] + ".svg";
	}
	else if (typeof(climaconMappings[description]) == "string") {
		return "climacons/" + climaconMappings[description] + ".svg";
	} else {
		return undefined;
	}
}

// Returns a rgb(a) background-color string given a temperature
function getTempColorString(temp) {
	if (temp > 0) {
		var opacity = temp / highCap;
		if (opacity > 1) {
			opacity = 1;
		}
		return "rgba(" + redBase + ", 0, 0, " + opacity + ")";
	}
	else if (temp < 0) {
		var opacity = temp / lowCap;
		if (opacity > 1) {
			opacity = 1;
		}
		return "rgba(0, 0, " + blueBase + ", " + opacity + ")";
	} else if (temp == 0) {
		return "rgb(255,255,255)";
	}
}

// Returns a shade of grey proportionate to the POP
function getPOPColorString(pop) {
	return "rgba(0,0,0," + pop/150 + ")";
}

// Populate a given error message in HTML
function populateError(errorString) {
	document.querySelector("#current .temp").innerHTML = "Error";
	document.querySelector("#current .description").innerHTML = errorString;
	
}

// Fill select menu
function populateSelect() {
	select = document.querySelector("#current select");

	// Redirect when different city selected
	select.addEventListener("change", function(e) {
		if (select.value != "") {
			redirectToLocationByID(select.value);
		}
	}, false);

	// Special cases first, so they’re at the top of the list and the default
	if (locationID == "") {
		var option = document.createElement("option");
		option.value = "";
		option.innerHTML = "Choose a location…";
		select.appendChild(option);
	}
	else if (locationMappings[locationID] == undefined) {
		var option = document.createElement("option");
		option.value = "";
		option.innerHTML = "Unknown location";
		select.appendChild(option);
	}

	// Fill locations
	var locationIDs = Object.keys(locationMappings);
	for (var i = 0; i < locationIDs.length; i++) {
		var option = document.createElement("option");
		option.value = locationIDs[i];
		if (locationIDs[i] == locationID) {
			option.selected = true;
		}
		option.innerHTML = locationMappings[locationIDs[i]];
		select.appendChild(option);
	}
}

// First responder after successful AJAX request. Creates weather object with <entry>s and passes it to the HTML populator.
function processResponse(dataEntries) {
	weather = new Object();

	weather.location = locationMappings[locationID];
	if (weather.location == undefined) {
		weather.location = "unknown location";
	}

	weather.forecasts = [];

	for (var i = 0; i < dataEntries.length; i++) {
		if (dataEntries[i].category.term == "Warnings and Watches") {
			weather.warnings = new Object();
			weather.warnings.text = dataEntries[i].title;
		}
		else if (dataEntries[i].category.term == "Current Conditions") {
			weather.current = new Object();
			weather.current = parseCurrent(dataEntries[i].title.split(": ")[1]);
		}
		else if (dataEntries[i].category.term == "Weather Forecasts") {
			var forecast = parseForecast(dataEntries[i]);
			weather.forecasts.push(forecast)
		}
	}

	populate(weather);
}

// Takes an EC-provided current conditons string and parses it into structured data
// Typical conditionsString: "Mostly Cloudy, 27.1°C"
function parseCurrent(conditionsString) {
	var conditions = new Object();

	var segments = conditionsString.split(", ");
	tempRegExp = new RegExp("^(.*)°C$");

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
	var splitString = forecastString.title.split(": ");
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

// Populates page with parsed weather object
function populate(weather) {
	// <TITLE>
	document.getElementById("head-title").innerHTML = "Weather in " + weather.location;

	// CURRENT TEMPERATURE
	document.querySelector("#current .temp").innerHTML = weather.current.temp + "°C";
	if (weather.current.description != undefined) {
		document.querySelector("#current .description").innerHTML = weather.current.description;
	}

	// CURRENT ICON
	var currentIconSrc = getClimaconSrc(weather.current);
	if (currentIconSrc == undefined) {
		currentIconSrc = "climacons/Thermometer-50.svg";
	}

	document.querySelector("#current .icon").src = currentIconSrc;
	document.querySelector("#current .icon-container").style.backgroundColor = getTempColorString(weather.current.temp);
	
	// If between -10 and +10, put a 1px border around the icon (light color, low contrast with #fff)
	if (weather.current.temp > -10 && weather.current.temp < 10) {
		document.querySelector("#current .icon-container").style.borderWidth = "1px";
	}

	// Set high and low header cells to the current temperature color
	document.querySelector("#forecasts thead th.low").style.backgroundColor = getTempColorString(weather.current.temp);
	document.querySelector("#forecasts thead th.high").style.backgroundColor = getTempColorString(weather.current.temp);
	
	// If background colour will be too dark, make affected icons and text white for increased contrast
	if (weather.current.temp < -colorInvertThreshold || weather.current.temp > colorInvertThreshold) {
		document.querySelector("#current img.icon").className = document.querySelector("#current img.icon").className + " dark";
		document.querySelector("#forecasts thead th.low").className = document.querySelector("#forecasts thead th.low").className + " dark";
		document.querySelector("#forecasts thead th.high").className = document.querySelector("#forecasts thead th.high").className + " dark";
	}

	// FORECAST TABLE ROWS
	document.getElementById("forecasts").setAttribute("style", "");
	var tbody = document.querySelector("#forecasts table tbody");
	for (var i = 0; i < weather.forecasts.length; i++) {
		var tdIcon = document.createElement("td");
		tdIcon.className = "icon";

		var divIconContainer = document.createElement("div");
		divIconContainer.className = "icon-container";

		var imgIconSrc = getClimaconSrc(weather.forecasts[i]);
		if (imgIconSrc != undefined) {
			var imgIcon = document.createElement("img");
			imgIcon.className = "icon";
			imgIcon.src = getClimaconSrc(weather.forecasts[i]);
			divIconContainer.appendChild(imgIcon);
		}

		tdIcon.appendChild(divIconContainer);

		var tdDateTime = document.createElement("td");
		tdDateTime.className = "datetime";
		tdDateTime.innerHTML = weather.forecasts[i].datetime;
		
		var tdLow = document.createElement("td");
		tdLow.className = "low";
		if (weather.forecasts[i].low != undefined) {
			tdLow.innerHTML = weather.forecasts[i].low + "°";
			tdLow.style.backgroundColor = getTempColorString(weather.forecasts[i].low);
			if (weather.forecasts[i].low < colorInvertThreshold && weather.forecasts[i].low > -colorInvertThreshold) {
				tdLow.className = tdLow.className + " light";
			}
		} else {
			tdLow.innerHTML = fillerText;
		}

		var tdHigh = document.createElement("td");
		tdHigh.className = "high";
		if (weather.forecasts[i].high != undefined) {
			tdHigh.innerHTML = weather.forecasts[i].high  + "°";
			tdHigh.style.backgroundColor = getTempColorString(weather.forecasts[i].high);
			if (weather.forecasts[i].high > colorInvertThreshold || weather.forecasts[i].high < -colorInvertThreshold) {
				tdHigh.className = tdHigh.className + " dark";
			}
		} else {
			tdHigh.innerHTML = fillerText;
		}

		var tdPOP = document.createElement("td");
		tdPOP.className = "pop";
		if (weather.forecasts[i].pop != undefined) {
			tdPOP.innerHTML = weather.forecasts[i].pop + "%";
			tdPOP.style.backgroundColor = getPOPColorString(weather.forecasts[i].pop);
			if (weather.forecasts[i].pop > 50) {
				tdPOP.className = tdPOP.className + " dark";
			}
			
		} else {
			tdPOP.innerHTML = fillerText;
			tdPOP.style.backgroundColor = getPOPColorString(0);
		}

		var tdDescription = document.createElement("td");
		tdDescription.className = "description"
		if (weather.forecasts[i].description != undefined) {
			tdDescription.innerHTML = weather.forecasts[i].description;
		} else {
			tdDescription.innerHTML = fillerText;
		}

		var tr = document.createElement("tr");
		if (weather.forecasts[i].datetime.indexOf("night") != -1) {
			tr.className = "night-row";
		}

		tr.appendChild(tdIcon);
		tr.appendChild(tdDateTime);
		tr.appendChild(tdLow);
		tr.appendChild(tdHigh);
		tr.appendChild(tdPOP);
		tr.appendChild(tdDescription);
		tbody.appendChild(tr);

		document.getElementById("weather-page-link").href = "http://weather.gc.ca/city/pages/" + locationID + "_metric_e.html"
	}
}
