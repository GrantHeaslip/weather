'use strict';

const Boom = require('boom');
const hapi = require('hapi');
const ejs = require('ejs');
const inert = require('inert');
const throng = require('throng');
const vision = require('vision');

const config = require('./lib/config');
const routes = require('./lib/routes');
const utils = require('./lib/utils');
const viewHelpers = require('./lib/view-helpers');

throng({
    workers: config.workers,
    lifetime: Infinity,
    master: startMaster,
    start: start,
});

function startMaster() {
    console.info('Throng master process started.');
}

async function start() {
    if (config.env == 'development') {
        console.info('Starting in development mode.');
    } else {
        console.info('Starting in production mode.');
    }

    // Create server
    const server = hapi.server({
        compression: {
            minBytes: 512,
        },
        host: '0.0.0.0',
        port: config.port,
        routes: {
            files: {
                relativeTo: __dirname,
            }
        },
    });

    // Register plugins
    await server.register(inert);
    await server.register(vision);

    const hashedFileNames = await utils.getRevManifest();
    const partiallyAppliedStaticHelper = viewHelpers.static.bind(null, hashedFileNames);

    // Initialize Vision view manager
    server.views({
        engines: { ejs: ejs },
        relativeTo: __dirname,
        path: 'templates',
        context: {
            'appEnv': config.env,
            'appVersion': await utils.getAppVersion(),
            'static': partiallyAppliedStaticHelper,
        },
    });

    // Load routes
    server.route(routes);

    // Add canonical protocol+host redirect extension function
    server.ext('onPostHandler', (request, h) => {
        const requestHost = request.info.host;
        const requestPath = request.path;
        const requestProtocol = request.headers['x-forwarded-proto'] || 'http';

        if (
            typeof config.canonicalHost !== 'undefined' &&
            typeof config.canonicalProtocol !== 'undefined' &&
            (
                requestHost !== config.canonicalHost ||
                requestProtocol !== config.canonicalProtocol
            )
        ) {
            return h.redirect(`${config.canonicalProtocol}://${config.canonicalHost}${requestPath}`);
        }

        // request.setUrl('/test');
        return h.continue;
    });


    // Intercept Inert’s directory handler JSON errors and render error view
    // instead. This feels like a bad solution, but it appears to be the only
    // way: https://github.com/hapijs/inert/issues/41
    server.ext('onPreResponse', (request, h) => {
        if ( !(request.response instanceof Boom) ) {
            return h.continue;
        }

        const boomError = request.response;

        if (
            boomError.typeof === Boom.notFound &&
            boomError.output.statusCode === 404 &&
            typeof boomError.data.path !== 'undefined' &&
            boomError.data.path.indexOf('static-build') !== -1
        ) {
            return h.view('error')
                .code(404);
        }

        return h.continue;
    });

    // Start server
    try {
        await server.start();
        console.info('Server started at ' + server.info.uri + '.');
    }
    catch (err) {
        console.error('Error starting sever:', err);
        process.exit(1);
    }
}
