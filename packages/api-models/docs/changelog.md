# Changelog

## [0.20.0-next.6](https://github.com/3sixtyglobal/api/compare/api-models-v0.20.0-next.5...api-models-v0.20.0-next.6) (2026-11-02)


### ⚠ BREAKING CHANGES

* the IpAddress context id is now a single address taken from the socket unless the peer is in trustedProxies, rather than a pipe joined list of forwarding header values. Set trustedProxies when running behind a proxy, "*" trusts any peer.

### Features

* add tenant admin rest client ([#62](https://github.com/3sixtyglobal/api/issues/62)) ([507229c](https://github.com/3sixtyglobal/api/commit/507229cd2803ccfbf38b708f6f3952de94ee9894))
* authorization ([#51](https://github.com/3sixtyglobal/api/issues/51)) ([023ef94](https://github.com/3sixtyglobal/api/commit/023ef94925114e88522cbe6f703d9b05a202bc6d))
* harden client IP, CORS credentials and cookie origin checks ([#56](https://github.com/3sixtyglobal/api/issues/56)) ([c0d914e](https://github.com/3sixtyglobal/api/commit/c0d914e45649812c7fa1b30c51178b0ca0eeab1a))
* obfuscate more logged secrets and add LivenessStatus ([#59](https://github.com/3sixtyglobal/api/issues/59)) ([8343dae](https://github.com/3sixtyglobal/api/commit/8343dae4b5c02d2dc7462141742233ce16d6a2d3))
* publish packages under the [@3sixty](https://github.com/3sixty) namespace ([91b1822](https://github.com/3sixtyglobal/api/commit/91b1822dba38f70692087ad4643572531d6634dc))
* release to next [skip ci] ([#54](https://github.com/3sixtyglobal/api/issues/54)) ([800b37b](https://github.com/3sixtyglobal/api/commit/800b37bbd673bbaedbdbc8dcfdf29f39a292e2c0))
* release to next [skip ci] ([#65](https://github.com/3sixtyglobal/api/issues/65)) ([2b1681b](https://github.com/3sixtyglobal/api/commit/2b1681bfc4b3c5561573b95b4515700343d04694))
* updated ts compile ([d9a5c86](https://github.com/3sixtyglobal/api/commit/d9a5c86ec7dd1faf3045b5cd1e0d38a4b331313d))

## [0.20.0-next.5](https://github.com/3sixtyglobal/api/compare/api-models-v0.20.0-next.4...api-models-v0.20.0-next.5) (2026-11-02)


### Features

* add tenant admin rest client ([#62](https://github.com/3sixtyglobal/api/issues/62)) ([507229c](https://github.com/3sixtyglobal/api/commit/507229cd2803ccfbf38b708f6f3952de94ee9894))

## [0.20.0-next.4](https://github.com/3sixtyglobal/api/compare/api-models-v0.20.0-next.3...api-models-v0.20.0-next.4) (2026-11-02)


### Features

* obfuscate more logged secrets and add LivenessStatus ([#59](https://github.com/3sixtyglobal/api/issues/59)) ([8343dae](https://github.com/3sixtyglobal/api/commit/8343dae4b5c02d2dc7462141742233ce16d6a2d3))

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
