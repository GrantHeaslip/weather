'use strict';

const fs = require('fs');
const util = require('util');

const config = require('../config');

const promisifiedReadFile = util.promisify(fs.readFile);

module.exports = async () => {
    try {
        const revManifestText = await promisifiedReadFile('./rev-manifest.json', 'utf8');
        const revManifestObject = JSON.parse(revManifestText);

        return revManifestObject;
    } catch (err) {
        if (config.env !== 'development') {
            console.error('Couldn’t read rev-manifest.json!');
        }
        return {};
    }
};
