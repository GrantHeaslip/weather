'use strict';

const displayConfig = require('../config/display');

module.exports = getTemperatureCssColor;

// Returns a rgb(a) background-color string given a temperature
function getTemperatureCssColor(temp) {
    if (temp > 0) {
        let opacity = temp / displayConfig.highCap;
        if (opacity > 1) {
            opacity = 1;
        }
        return `rgba(${displayConfig.redBase}, 0, 0, ${opacity})`;
    }
    else if (temp < 0) {
        let opacity = temp / displayConfig.lowCap;
        if (opacity > 1) {
            opacity = 1;
        }
        return `rgba(0, 0, ${displayConfig.blueBase}, ${opacity})`;
    } else if (temp == 0) {
        return 'rgb(255,255,255)';
    }
}
