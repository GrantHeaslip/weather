'use strict';

const fs = require('fs');
const util = require('util');

const promisifiedReadFile = util.promisify(fs.readFile);

module.exports = async () => {
    try {
        const packageJsonText = await promisifiedReadFile('./package.json', 'utf8');
        const packageJsonObject = JSON.parse(packageJsonText);

        return packageJsonObject.version;
    } catch (err) {
        console.error('Couldn’t read package.json!');
        return null;
    }
};
