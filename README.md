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

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in your project):

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

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "sonovault": {
      "command": "npx",
      "args": ["-y", "sonovault-mcp"],
      "env": { "SONOVAULT_API_KEY": "svk_live_..." }
    }
  }
}
```

### Windsurf

Add the same `mcpServers` block as Claude Desktop to `~/.codeium/windsurf/mcp_config.json`.

### Other MCP clients

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

## Example workflows

### Enrich a radio play log for royalty reporting

Paste a play log with just artist and title, and ask: "Resolve these to ISRC, album, and label, and give me a table I can map onto a SoundExchange Report of Use." The assistant calls `resolve_tracks` once per 100 lines and returns the identifiers collecting societies match on. Works the same for PPL, Sena, GVL, and Re:Sound reporting.

### Clean up a DJ library

"Here are 50 tracks from my rekordbox export. Find the canonical version of each, flag duplicates that share an ISRC, and tag each with its genre." The assistant combines `resolve_tracks` with the genre fields on each result.

### Bridge recordings to compositions

"I have ISRCs from my distributor. Which musical works do they belong to, and what other recordings exist of each work?" The assistant chains `get_work_codes` and `get_recordings_of_work`. Useful for publishing administration and cover/version research.

### Check cross-platform availability

"Is this Beatport exclusive on Spotify yet? Beatport ID 6014288." One `get_platform_links` call answers it, with deep links per platform.

### Research a label

"Summarize what Anjunabeats released in the last six months, grouped by subgenre." The assistant pages through `get_label_releases` and pulls genre from the tracklists.

## FAQ

### Is there a free tier?

Yes. A free SonoVault key includes 1,000 requests/month with no credit card. Every tool except `browse_tracks` works on it.

### What metadata does each track include?

Title, artist credits (with primary/remixer flags), ISRC, duration, genre and subgenre, and per-release album title, label, and release date. ISWC work codes come from the dedicated work-code tools.

### Does it return BPM or musical key?

No. The public SonoVault API deliberately excludes audio features like BPM, key, and energy. No audio previews or artwork either.

### Where does the data come from?

Aggregated and deduplicated from MusicBrainz, Discogs, Spotify, Apple Music, Tidal, and Beatport, with ISWC links from The MLC. Details: [sonovault.now/data-sources](https://sonovault.now/data-sources).

### How is this different from a Spotify API integration?

Single-platform APIs return their own IDs only. SonoVault resolves one recording to its IDs on all seven supported platforms, keyed by ISRC, and adds identifiers (ISRC, ISWC) that platform APIs don't expose. Comparison: [sonovault.now/compare/spotify-api](https://sonovault.now/compare/spotify-api).

### Is my API key sent anywhere besides SonoVault?

No. The server runs locally over stdio and sends your key only to `api.sonovault.now` as a request header. The code is small and auditable: [src/server.ts](src/server.ts).

## Related

- [SonoVault API docs](https://sonovault.now/docs)
- [sonovault-js](https://github.com/rekordcloud/sonovault-js) and [sonovault-python](https://github.com/rekordcloud/sonovault-python), the client SDKs (this server is built on sonovault-js)

## License

MIT
