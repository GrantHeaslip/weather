'use strict';

// Note: This is exposed in the template context with hashedFileNames bound,
// so it should be called as `static(fileName)`
exports.static = (hashedFileNames, fileName) => {
    let outputFileName = hashedFileNames[fileName] || fileName;

    return `/static/${outputFileName}`;
};
