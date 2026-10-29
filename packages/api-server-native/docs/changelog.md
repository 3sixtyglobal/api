# Changelog

## [0.20.0-next.3](https://github.com/3sixtyglobal/api/compare/api-server-native-v0.20.0-next.2...api-server-native-v0.20.0-next.3) (2026-10-29)


### ⚠ BREAKING CHANGES

* the IpAddress context id is now a single address taken from the socket unless the peer is in trustedProxies, rather than a pipe joined list of forwarding header values. Set trustedProxies when running behind a proxy, "*" trusts any peer.

### Features

* harden client IP, CORS credentials and cookie origin checks ([#56](https://github.com/3sixtyglobal/api/issues/56)) ([c0d914e](https://github.com/3sixtyglobal/api/commit/c0d914e45649812c7fa1b30c51178b0ca0eeab1a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @3sixty/api-core-server bumped from 0.20.0-next.2 to 0.20.0-next.3
    * @3sixty/api-models bumped from 0.20.0-next.2 to 0.20.0-next.3
  * devDependencies
    * @3sixty/api-processors bumped from 0.20.0-next.2 to 0.20.0-next.3

## [0.20.0-next.2](https://github.com/3sixtyglobal/api/compare/api-server-native-v0.20.0-next.1...api-server-native-v0.20.0-next.2) (2026-10-26)


### Features

* release to next [skip ci] ([#54](https://github.com/3sixtyglobal/api/issues/54)) ([800b37b](https://github.com/3sixtyglobal/api/commit/800b37bbd673bbaedbdbc8dcfdf29f39a292e2c0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @3sixty/api-core-server bumped from 0.20.0-next.1 to 0.20.0-next.2
    * @3sixty/api-models bumped from 0.20.0-next.1 to 0.20.0-next.2
  * devDependencies
    * @3sixty/api-processors bumped from 0.20.0-next.1 to 0.20.0-next.2

## [0.20.0-next.1](https://github.com/3sixtyglobal/api/compare/api-server-native-v0.20.0-next.0...api-server-native-v0.20.0-next.1) (2026-10-23)


### Features

* authorization ([#51](https://github.com/3sixtyglobal/api/issues/51)) ([023ef94](https://github.com/3sixtyglobal/api/commit/023ef94925114e88522cbe6f703d9b05a202bc6d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @3sixty/api-core-server bumped from 0.20.0-next.0 to 0.20.0-next.1
    * @3sixty/api-models bumped from 0.20.0-next.0 to 0.20.0-next.1
  * devDependencies
    * @3sixty/api-processors bumped from 0.20.0-next.0 to 0.20.0-next.1
