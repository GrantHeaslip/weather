'use strict';

module.exports = staticPath;

// Note: This is exposed in the template context with hashedFileNames bound,
// so it should be called as `staticPath(fileName)`
function staticPath(hashedFileNames, fileName) {
    let outputFileName = hashedFileNames[fileName] || fileName;

    return `/static/${outputFileName}`;
}
