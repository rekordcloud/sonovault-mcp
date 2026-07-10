# Changelog

All notable changes to this package are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [1.0.1] - 2026-07-10

### Changed

- Descriptions now lead with catalog search (tracks, artists, releases) instead of ISRC/ISWC lookup.

## [1.0.0] - 2026-07-10

### Added

- Initial release: MCP server over stdio, built on the `sonovault` SDK.
- 15 read-only tools: track search, ISRC lookup, ISWC work-code mapping (both directions), cross-platform links, bulk resolve, artists, labels, releases, genres, and catalog browse.
- API errors surface as tool errors with actionable messages (auth, paid-tier).
