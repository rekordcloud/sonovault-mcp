import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SonoVault, SonoVaultError } from "sonovault";
import { z } from "zod";

export const SERVER_VERSION = "1.0.0";

/** Serialize an API result as a pretty-printed JSON text block. */
function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/** Turn API errors into readable tool errors instead of protocol failures. */
function toolError(err: unknown) {
  const message =
    err instanceof SonoVaultError
      ? `SonoVault API error (HTTP ${err.status}): ${err.message}` +
        (err.isForbidden ? " (this endpoint needs a paid SonoVault tier)" : "") +
        (err.isAuthError ? " (check SONOVAULT_API_KEY)" : "")
      : `Error: ${(err as Error).message}`;
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function wrap<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      return json(await fn(...args));
    } catch (err) {
      return toolError(err);
    }
  };
}

/**
 * Build the MCP server around a SonoVault client. The client is injected so
 * tests can pass a fake.
 */
export function createServer(sv: SonoVault): McpServer {
  const server = new McpServer({ name: "sonovault", version: SERVER_VERSION });

  server.registerTool(
    "search_tracks",
    {
      title: "Search tracks",
      description:
        "Search the SonoVault catalog (90M+ tracks) by artist and title. Both are required; there is no free-text search. Returns ISRC, genre, duration, artist credits, and release info (album, label, release date) per track.",
      inputSchema: {
        artist: z.string().describe("Artist name, e.g. 'Daft Punk'"),
        title: z.string().describe("Track title, e.g. 'One More Time'"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)"),
      },
    },
    wrap(async ({ artist, title, limit }) => sv.tracks.search({ artist, title, limit })),
  );

  server.registerTool(
    "get_track",
    {
      title: "Get track by ID",
      description: "Fetch one track by its SonoVault track ID, with full metadata.",
      inputSchema: { id: z.number().int().describe("SonoVault track ID") },
    },
    wrap(async ({ id }) => sv.tracks.get(id)),
  );

  server.registerTool(
    "lookup_isrc",
    {
      title: "Look up a track by ISRC",
      description:
        "Exact lookup of a recording by its ISRC (International Standard Recording Code, e.g. GBDUW0000053). Returns the track's full metadata.",
      inputSchema: { isrc: z.string().describe("ISRC code, e.g. GBDUW0000053") },
    },
    wrap(async ({ isrc }) => sv.tracks.byIsrc(isrc)),
  );

  server.registerTool(
    "get_work_codes",
    {
      title: "Recording to composition (ISWC)",
      description:
        "Find the ISWC work code(s) behind a recording, by ISRC or SonoVault track ID. Useful for royalty and publishing workflows. One recording can carry several ISWCs (medleys, samples).",
      inputSchema: {
        isrc: z.string().optional().describe("ISRC of the recording"),
        track_id: z.number().int().optional().describe("SonoVault track ID (alternative to isrc)"),
      },
    },
    wrap(async ({ isrc, track_id }) => sv.tracks.iswc({ isrc, id: track_id })),
  );

  server.registerTool(
    "get_recordings_of_work",
    {
      title: "Composition to recordings (ISWC)",
      description:
        "List every recording of a musical work by its ISWC (e.g. T0710204399 or T-071.020.439-9). Returns recordings sorted by popularity, each with a representative ISRC.",
      inputSchema: {
        iswc: z.string().describe("ISWC work code"),
        limit: z.number().int().min(1).max(200).optional().describe("Max recordings (default 50)"),
      },
    },
    wrap(async ({ iswc, limit }) => sv.tracks.byIswc(iswc, { limit })),
  );

  server.registerTool(
    "get_platform_links",
    {
      title: "Cross-platform links",
      description:
        "Resolve a track to its ID and deep link on every supported platform: Spotify, Apple Music, Tidal, Beatport, Discogs, MusicBrainz, YouTube. Identify the track by exactly one of: SonoVault id, ISRC, or any platform's ID.",
      inputSchema: {
        id: z.number().int().optional().describe("SonoVault track ID"),
        isrc: z.string().optional(),
        spotify_id: z.string().optional(),
        applemusic_id: z.string().optional(),
        tidal_id: z.string().optional(),
        beatport_id: z.string().optional(),
        discogs_id: z.string().optional(),
        musicbrainz_id: z.string().optional(),
        youtube_id: z.string().optional(),
      },
    },
    wrap(async (params) => sv.tracks.links(params)),
  );

  server.registerTool(
    "resolve_tracks",
    {
      title: "Bulk resolve",
      description:
        "Resolve up to 100 inputs in one call to canonical tracks plus cross-platform links. input_type picks the key: 'track_name' (items are {artist, title} objects), 'isrc', 'sonovault_id', or a platform id type ('spotify_id', 'applemusic_id', 'tidal_id', 'beatport_id', 'discogs_id', 'musicbrainz_id'). Costs one API credit per line.",
      inputSchema: {
        input_type: z.enum([
          "track_name",
          "isrc",
          "sonovault_id",
          "spotify_id",
          "applemusic_id",
          "tidal_id",
          "beatport_id",
          "discogs_id",
          "musicbrainz_id",
        ]),
        items: z
          .array(z.union([z.string(), z.object({ artist: z.string(), title: z.string() })]))
          .min(1)
          .max(100)
          .describe("Strings for id/isrc types; {artist, title} objects for track_name"),
      },
    },
    wrap(async ({ input_type, items }) => sv.tracks.resolve({ input_type, items })),
  );

  server.registerTool(
    "search_artists",
    {
      title: "Search artists",
      description: "Search artists by name. Returns id, name, country, formation year, and release count.",
      inputSchema: {
        name: z.string().describe("Artist name to search for"),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    wrap(async ({ name, limit }) => sv.artists.search({ name, limit })),
  );

  server.registerTool(
    "get_artist_releases",
    {
      title: "Artist releases",
      description: "An artist's releases, newest first. Use the cursor from a previous call for the next page.",
      inputSchema: {
        artist_id: z.number().int().describe("SonoVault artist ID (from search_artists)"),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional().describe("next_cursor from the previous page"),
      },
    },
    wrap(async ({ artist_id, limit, cursor }) => sv.artists.releases(artist_id, { limit, cursor })),
  );

  server.registerTool(
    "search_labels",
    {
      title: "Search record labels",
      description: "Search record labels by name. Returns id, name, and release count.",
      inputSchema: {
        name: z.string().describe("Label name to search for"),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    wrap(async ({ name, limit }) => sv.labels.search({ name, limit })),
  );

  server.registerTool(
    "get_label_releases",
    {
      title: "Label releases",
      description: "A label's releases, newest first, with artist per release. Cursor-paginated.",
      inputSchema: {
        label_id: z.number().int().describe("SonoVault label ID (from search_labels)"),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      },
    },
    wrap(async ({ label_id, limit, cursor }) => sv.labels.releases(label_id, { limit, cursor })),
  );

  server.registerTool(
    "search_releases",
    {
      title: "Search releases (albums)",
      description: "Search releases by title, optionally narrowed by artist name.",
      inputSchema: {
        title: z.string().describe("Release/album title"),
        artist: z.string().optional().describe("Artist name to narrow the match"),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    wrap(async ({ title, artist, limit }) => sv.releases.search({ title, artist, limit })),
  );

  server.registerTool(
    "get_release",
    {
      title: "Get release with tracklist",
      description: "Fetch one release by SonoVault release ID, including its full tracklist with ISRCs.",
      inputSchema: { id: z.number().int().describe("SonoVault release ID") },
    },
    wrap(async ({ id }) => sv.releases.get(id)),
  );

  server.registerTool(
    "list_genres",
    {
      title: "List genres",
      description: "The canonical SonoVault genre hierarchy: 25 main genres plus subgenres, with IDs.",
      inputSchema: {},
    },
    wrap(async () => sv.genres.list()),
  );

  server.registerTool(
    "browse_tracks",
    {
      title: "Browse the catalog",
      description:
        "Discover tracks by filter: label ID, artist ID, genre name or genre ID (from list_genres), or release year. At least one filter is required. Needs a paid SonoVault tier; free-tier keys get a 403.",
      inputSchema: {
        label_id: z.number().int().optional(),
        artist_id: z.number().int().optional(),
        genre: z.string().optional().describe("Exact genre name (mutually exclusive with genre_id)"),
        genre_id: z.number().int().optional().describe("Canonical genre ID (mutually exclusive with genre)"),
        year: z.number().int().min(1900).max(2100).optional(),
        randomize: z.boolean().optional().describe("Sample randomly instead of newest first"),
      },
    },
    wrap(async ({ label_id, artist_id, genre, genre_id, year, randomize }) =>
      sv.tracks.browse({ labelId: label_id, artistId: artist_id, genre, genreId: genre_id, year, randomize }),
    ),
  );

  return server;
}
