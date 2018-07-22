'use strict';

const config = require('./config');

const hashedStaticFileCacheOptions = {
    privacy: 'public',
    expiresIn: 31536000000,
    statuses: [200],
    otherwise: 'no-cache',
};

const unhashedStaticFileCacheOptions = {
    privacy: 'public',
    expiresIn: 86400000,
    statuses: [200],
    otherwise: 'no-cache',
};

const pathEndingInIndexHtmlRegExp = /(.*\/)index\.html/;

module.exports = getRoutes;

function getRoutes(server) {
    return [
        {
            method: 'GET',
            path:'/',
            handler: function (request, h) {
                return h.view('index');
            },
        },
        {
            method: 'GET',
            path:'/cities/{citySlug}.html',
            handler: require('./handlers/weather')(server),
        },
        {
            method: 'GET',
            path:'/favicon.ico',
            handler: {
                file: {
                    etagMethod: 'hash',
                    lookupCompressed: false,
                    path: 'static/favicons/favicon.ico',
                },
            },
            options: {
                cache: unhashedStaticFileCacheOptions,
            },
        },
        {
            method: 'GET',
            path:'/robots.txt',
            handler: {
                file: {
                    etagMethod: 'hash',
                    lookupCompressed: false,
                    path: 'static/robots.txt',
                },
            },
            options: {
                cache: unhashedStaticFileCacheOptions,
            },
        },
        {
            method: 'GET',
            path: '/static/{fileName*}',
            handler: {
                directory: {
                    etagMethod: false,
                    index: false,
                    lookupCompressed: false,
                    path: config.staticDir,
                    redirectToSlash: false,
                },
            },
            options: {
                cache: hashedStaticFileCacheOptions,
            },
        },
        {
            method: '*',
            path: '/{unmatchedPath*}',
            handler: function (request, h) {
                // If request path ends in “/index.html”, redirect to same path
                // without “index.html”
                const pathFollowedByIndexHtmlRegExp = request.path
                    .match(pathEndingInIndexHtmlRegExp);

                if (
                    Array.isArray(pathFollowedByIndexHtmlRegExp) &&
                    pathFollowedByIndexHtmlRegExp.length === 2
                ) {
                    const pathWithoutIndexHtml = pathFollowedByIndexHtmlRegExp[1];

                    return h
                        .redirect(pathWithoutIndexHtml)
                        .code(301);
                }

                return h.view('error')
                    .code(404);
            }
        },
    ];
}
