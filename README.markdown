# weather

[Canadian weather website][weather] using Environment Canada data. Powered by [Node.js][node-js] and the [Hapi framework][hapi].

Please note that this is a Node.js and ECMAScript 2015+ learning project. You might want to get a second opinion before you copy anything. I hope some of this code will help anyone using [Hapi 17][hapi-17] or newer, which seems to have been a fairly significant rewrite of parts of the framework.

## How to run

- Run `npm install`.
- Create an `.env` file using `.env-sample` as a template.
- To run the server:
    - If using the [Heroku CLI][heroku-cli]: Run [`heroku local`][heroku-local], which sources `.env` and runs the `web` command in `Procfile`.
    - If using the [Bash shell][bash], run `source source_env.sh` to load the variables from `.env` into the environment, then run `node server.js` or `npm start`.
    - If using the [Fish shell][fish], install [Bass][bass], run `bass source source_env.sh` to load the variables from `.env` into the environment, then run `node server.js` or `npm start`.

[bash]: https://www.gnu.org/software/bash/
[bass]: https://github.com/edc/bass
[fish]: https://fishshell.com/
[hapi]: https://hapijs.com/
[hapi-17]: https://github.com/hapijs/hapi/issues/3658
[heroku]: https://www.heroku.com/
[heroku-cli]: https://devcenter.heroku.com/articles/heroku-cli
[heroku-local]: https://devcenter.heroku.com/articles/heroku-local
[node-js]: https://nodejs.org/
[weather]: https://weather.g.hslp.ca/
