# Changelog

## [0.20.0-next.3](https://github.com/3sixtyglobal/api/compare/api-models-v0.20.0-next.2...api-models-v0.20.0-next.3) (2026-10-29)


### ⚠ BREAKING CHANGES

* the IpAddress context id is now a single address taken from the socket unless the peer is in trustedProxies, rather than a pipe joined list of forwarding header values. Set trustedProxies when running behind a proxy, "*" trusts any peer.

### Features

* harden client IP, CORS credentials and cookie origin checks ([#56](https://github.com/3sixtyglobal/api/issues/56)) ([c0d914e](https://github.com/3sixtyglobal/api/commit/c0d914e45649812c7fa1b30c51178b0ca0eeab1a))

## [0.20.0-next.2](https://github.com/3sixtyglobal/api/compare/api-models-v0.20.0-next.1...api-models-v0.20.0-next.2) (2026-10-26)


### Features

* release to next [skip ci] ([#54](https://github.com/3sixtyglobal/api/issues/54)) ([800b37b](https://github.com/3sixtyglobal/api/commit/800b37bbd673bbaedbdbc8dcfdf29f39a292e2c0))

## [0.20.0-next.1](https://github.com/3sixtyglobal/api/compare/api-models-v0.20.0-next.0...api-models-v0.20.0-next.1) (2026-10-23)


### Features

* authorization ([#51](https://github.com/3sixtyglobal/api/issues/51)) ([023ef94](https://github.com/3sixtyglobal/api/commit/023ef94925114e88522cbe6f703d9b05a202bc6d))
* publish packages under the [@3sixty](https://github.com/3sixty) namespace ([91b1822](https://github.com/3sixtyglobal/api/commit/91b1822dba38f70692087ad4643572531d6634dc))
* updated ts compile ([d9a5c86](https://github.com/3sixtyglobal/api/commit/d9a5c86ec7dd1faf3045b5cd1e0d38a4b331313d))
