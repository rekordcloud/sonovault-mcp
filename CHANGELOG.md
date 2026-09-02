# Changelog

All notable changes to this package are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Changed

- `get_release` describes the tracklist it returns: tracks come back in playing order, each with `disc_number` and `track_number`, and a track whose position is unknown sorts last with both null.
- `search_artists` describes `wikidata_id` and `musicbrainz_id`, the identifiers for joining an artist against external datasets.

Both are description-only, so an assistant knows the fields exist and what the ordering means. No tool signature changed.

## [1.0.3] - 2026-09-02

### Changed

- Depends on `sonovault` ^3.0.0 (was ^1.2.0, a caret range that could never reach 2.x, so the server had been pinned to the 1.2 client for two majors). The tool surface is unchanged: this server calls none of the methods that changed, and every tool returns the same JSON it did before. What it picks up is the client's corrected response types, most visibly `Track.genre` and `Track.subgenre` as string arrays.

## [1.0.2] - 2026-07-10

### Changed

- README: setup for Cursor, VS Code, and Windsurf; example workflows; FAQ.

## [1.0.1] - 2026-07-10

### Changed

- Descriptions now lead with catalog search (tracks, artists, releases) instead of ISRC/ISWC lookup.

## [1.0.0] - 2026-07-10

### Added

- Initial release: MCP server over stdio, built on the `sonovault` SDK.
- 15 read-only tools: track search, ISRC lookup, ISWC work-code mapping (both directions), cross-platform links, bulk resolve, artists, labels, releases, genres, and catalog browse.
- API errors surface as tool errors with actionable messages (auth, paid-tier).
