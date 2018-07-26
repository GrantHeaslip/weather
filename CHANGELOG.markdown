# Weather changelog

## 1.0.1 [2018-07-26]

### Changes
* Changed footer developer URL to [g.hslp.ca](https://g.hslp.ca/).
* Updated description and author metadata.

## 1.0.0 [2018-07-22]

(First version deployed to [weather.grant.heaslip.me](https://weather.grant.heaslip.me/), replacing old client-rendered version.)

### Fixes
* Forecasts without condition:icon mappings no longer have broken icons (added a default fallback icon).
* Forecast low and high temperatures now include “°” ([#1]).
* Forecast POP values now include “%”.

### Improvements
* Legacy `/?id={citySlug}` URLs now redirect to `/cities/{citySlug}.html`.
* `/` and `/cities/` now redirect to `/cities/on-143.html` (Toronto) ([#3]).
* Footer links now point at HTTPS versions of sites where available.
* Added several condition:icon mappings.
* Browser scroll bar is no longer forced to display.
* Weather icons are now hidden from screen readers since they’re decorative.

### Changes
* Changed weather path to `/cities/{citySlug}.html` (was `/city/{citySlug}.html`)

[#1]: https://github.com/GrantHeaslip/weather/issues/1
[#3]: https://github.com/GrantHeaslip/weather/issues/3

## 1.0.0-beta.1 [2018-07-15]

(First release of Node rewrite.)
