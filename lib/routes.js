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

function getCanonicalUrl(request) {
    if (
        typeof config.canonicalHost === 'undefined' ||
        typeof config.canonicalProtocol === 'undefined'
    ) {
        return null;
    } else {
        return `${config.canonicalProtocol}://${config.canonicalHost}${request.url.path}`;
    }
}

module.exports = [
    {
        method: 'GET',
        path:'/',
        handler: (request, h) => {
            // TODO: Move canonicalUrl context variable to global context
            // (defined in server.views.context) once vision supports awaiting
            // async factory functions.
            return h.view(
                'index',
                {
                    canonicalUrl: getCanonicalUrl(request)
                },
            );
        },
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
        handler: (request, h) => {
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
