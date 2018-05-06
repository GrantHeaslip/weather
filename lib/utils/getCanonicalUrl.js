'use strict';

const config = require('../config');

module.exports = getCanonicalUrl;

function getCanonicalUrl(path) {
    if (
        typeof config.canonicalHost === 'undefined' ||
        typeof config.canonicalProtocol === 'undefined'
    ) {
        return null;
    } else {
        return `${config.canonicalProtocol}://${config.canonicalHost}${path}`;
    }
}
