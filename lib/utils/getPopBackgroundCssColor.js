'use strict';

const popBackgroundMinRgbValue = require('../config/display').popBackgroundMinRgbValue;

module.exports = getPopBackgroundCssColor;

// Returns a shade of grey proportionate to the POP
function getPopBackgroundCssColor(pop) {
    const rgbValue = (
        popBackgroundMinRgbValue
        + (
            (255 - popBackgroundMinRgbValue)
            * (100 - pop) / 100
        )
    );

    return `rgb(${rgbValue}, ${rgbValue}, ${rgbValue})`;
}
