'use strict';

const Boom = require('boom');
const catboxRedis = require('catbox-redis');
const ejs = require('ejs');
const hapi = require('hapi');
const inert = require('inert');
const throng = require('throng');
const vision = require('vision');

const config = require('./lib/config');
const utils = require('./lib/utils');
const viewHelpers = require('./lib/viewHelpers');

if (config.env === 'development') {
    console.info('Starting in development mode.');
    startMaster();
    startWorker(1);
} else {
    throng({
        workers: config.workers,
        lifetime: Infinity,
        master: startMaster,
        start: startWorker,
    });
}

async function getServer() {
    const appVersion = await utils.getAppVersion();

    const cachePartitionName = `weather-${appVersion}`.replace(/(\.)/g, '-');

    // Create server
    const server = hapi.server({
        cache: [
            {
                name: 'redis',
                engine: catboxRedis,
                partition: cachePartitionName,
                url: config.redisUrl,
            },
        ],
        compression: {
            minBytes: 512,
        },
        // Note: Commented out because of what seems to be Hapi.js bug causing
        // erroneous “Debug: request, error, close” and “Debug: response, error,
        // close” error logs. (https://github.com/hapijs/hapi/issues/2649)
        // debug: {
        //     request: ['error'] // TODO: Make env-dependent
        // },
        host: '0.0.0.0',
        port: config.port,
        routes: {
            files: {
                relativeTo: __dirname,
            }
        },
    });

    return server;
}

async function startMaster() {
    const server = await getServer();

    (async function attemptToInitializeServer() {
        try {
            await server.initialize();
            utils.startCityWeatherDataBackgroundUpdateLoop(server);
            console.info('Master (background update loop) process started.');
        } catch (error) {
            server.stop();

            if (error.code === 'ECONNREFUSED' && error.port === 6379) {
                console.warn('Couldn’t start master (background update loop) process because Redis is inaccessible. Will retry in 30 seconds.');

                setTimeout(attemptToInitializeServer, 30000);
            } else {
                console.warn('Unexpected error while starting master (background update loop) process:', error);
            }
        }
    })();
}

async function startWorker(workerId) {
    const appVersion = await utils.getAppVersion();
    const server = await getServer();

    // Register plugins
    await server.register(inert);
    await server.register(vision);

    // TODO: Restore once build set up
    // const hashedFileNames = await utils.getRevManifest();
    // const partiallyAppliedStaticPathHelper = viewHelpers.staticPath.bind(null, hashedFileNames);

    const partiallyAppliedStaticPathHelper = viewHelpers.staticPath.bind(null, {});

    // Initialize Vision view manager
    server.views({
        engines: { ejs: ejs },
        relativeTo: __dirname,
        path: 'templates',
        context: function (request) {
            return {
                'appEnv': config.env,
                'appVersion': appVersion,
                'canonicalUrl': utils.getCanonicalUrl(request.url.path),
                'staticPath': partiallyAppliedStaticPathHelper,
            };
        },
    });

    // Load routes
    server.route(require('./lib/routes')(server));

    // Add canonical protocol+host redirect extension function
    server.ext('onPostHandler', function(request, h) {
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
    server.ext('onPreResponse', function (request, h) {
        if ( !(request.response instanceof Boom) ) {
            return h.continue;
        }

        const boomError = request.response;

        if (
            boomError.typeof === Boom.notFound &&
            boomError.output.statusCode === 404 &&
            typeof boomError.data.path !== 'undefined' &&
            boomError.data.path.indexOf('static') !== -1
        ) {
            return h.view('error')
                .code(404);
        }

        return h.continue;
    });

    (async function attemptToStartServer() {
        try {
            await server.start();
            console.info(`Worker (request handler) process ${workerId}/${config.workers} started`);
        } catch (error) {
            server.stop();

            if (error.code === 'ECONNREFUSED' && error.port === 6379) {
                console.warn(`Couldn’t start worker (request handler) process ${workerId}/${config.workers} because Redis is inaccessible. Will retry in 30 seconds.`);

                setTimeout(attemptToStartServer, 30000);
            } else {
                console.warn(`Unexpected error while starting worker (request handler) process ${workerId}/${config.workers}:`, error);
            }
        }
    })();
}
