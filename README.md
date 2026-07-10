# sonovault-mcp

[![CI](https://github.com/rekordcloud/sonovault-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/rekordcloud/sonovault-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/sonovault-mcp)](https://www.npmjs.com/package/sonovault-mcp)

MCP server for the **[SonoVault](https://sonovault.now)** music metadata API. Gives Claude, Cursor, and any MCP client search across 90M+ tracks, artists, labels, and releases, with full metadata per result: genre, label, release dates, artist credits, ISRC and ISWC codes, and cross-platform IDs (Spotify, Apple Music, Tidal, Beatport, Discogs, MusicBrainz, YouTube).

Ask your assistant things like:

- "What releases did mau5trap put out this year?"
- "Find Daft Punk's Veridis Quo and give me its genre, label, and ISRC"
- "Show me the tracklist of Discovery with ISRCs"
- "What's the Spotify and Beatport ID for ISRC GBDUW0000053?"
- "Resolve this play log to ISRCs and labels" (paste up to 100 lines)
- "List every recording of ISWC T-071.020.439-9"

## Setup

You need a SonoVault API key. The free tier is 1,000 requests/month, no credit card: [get a key](https://sonovault.now).

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sonovault": {
      "command": "npx",
      "args": ["-y", "sonovault-mcp"],
      "env": { "SONOVAULT_API_KEY": "svk_live_..." }
    }
  }
}
```

### Claude Code

```bash
claude mcp add sonovault -e SONOVAULT_API_KEY=svk_live_... -- npx -y sonovault-mcp
```

### Cursor / VS Code / other MCP clients

Any client that speaks MCP over stdio works. Command: `npx -y sonovault-mcp` with the `SONOVAULT_API_KEY` environment variable set.

## Tools

| Tool | What it does |
|---|---|
| `search_tracks` | Fuzzy search by artist + title. Returns ISRC, genre, label, release date. |
| `lookup_isrc` | Exact recording lookup by ISRC. |
| `get_track` | Fetch a track by SonoVault ID. |
| `get_work_codes` | Recording to composition: the ISWC(s) behind a recording. |
| `get_recordings_of_work` | Composition to recordings: every recording of an ISWC. |
| `get_platform_links` | One track's ID and deep link on all 7 platforms, from any ID or ISRC. |
| `resolve_tracks` | Bulk resolve up to 100 track names, ISRCs, or platform IDs. |
| `search_artists`, `get_artist_releases` | Artist search and discography. |
| `search_labels`, `get_label_releases` | Label search and catalog. |
| `search_releases`, `get_release` | Release search and tracklists with ISRCs. |
| `list_genres` | The canonical genre hierarchy. |
| `browse_tracks` | Discover by label, artist, genre, or year (paid tier). |

All tools are read-only. Most work on the free tier; `browse_tracks` needs a paid plan.

## Use cases

- **Royalty reporting**: resolve radio play logs to the ISRC + label fields SoundExchange, PPL, and other societies match on.
- **Publishing workflows**: bridge recordings to compositions with ISRC to ISWC mapping.
- **Library tools**: dedupe and enrich music libraries by canonical identifiers.
- **Cross-platform apps**: turn any platform's track ID into all the others.

## Related

- [SonoVault API docs](https://sonovault.now/docs)
- [sonovault-js](https://github.com/rekordcloud/sonovault-js) and [sonovault-python](https://github.com/rekordcloud/sonovault-python), the client SDKs (this server is built on sonovault-js)

## License

MIT
