import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { SonoVault } from "sonovault";
import { beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

const TRACK = {
  id: 123,
  title: "One More Time",
  artists: [{ id: 1, name: "Daft Punk" }],
  isrc: "GBDUW0000053",
  releases: [],
  duration: 320,
  genre: ["House"],
  subgenre: [],
};

function fakeSv(overrides: Record<string, unknown> = {}) {
  const err403 = Object.assign(new Error("Paid plan required"), { status: 403 });
  return {
    tracks: {
      search: async () => ({ results: [TRACK], next_cursor: null }),
      get: async (id: number) => ({ ...TRACK, id }),
      byIsrc: async () => TRACK,
      iswc: async () => ({ sonovault_id: 123, isrc: "GBDUW0000053", iswcs: [{ iswc: "T0710204399", title: "ONE MORE TIME" }] }),
      byIswc: async () => ({ iswc: "T0710204399", results: [TRACK] }),
      links: async () => ({ track_id: 123, title: TRACK.title, links: [{ source: "spotify", external_id: "x", url: "https://open.spotify.com/track/x" }] }),
      resolve: async () => ({ results: [{ input: "GBDUW0000053", status: "matched", track: TRACK, links: [] }], partial: false, processed: 1, credits_used: 1, credits_remaining: 999, message: null }),
      browse: async () => {
        throw err403;
      },
    },
    artists: {
      search: async () => ({
        results: [{ id: 1, name: "Daft Punk", country: "France", wikidata_id: "Q185828", musicbrainz_id: "056e4f3e-d505-4dad-8ec1-d04f521cbb56" }],
        next_cursor: null,
      }),
      releases: async () => ({ results: [], next_cursor: null }),
    },
    labels: {
      search: async () => ({ results: [{ id: 10, name: "Virgin" }], next_cursor: null }),
      releases: async () => ({ results: [], next_cursor: null }),
    },
    releases: {
      search: async () => ({ results: [], next_cursor: null }),
      get: async () => ({
        id: 1,
        title: "Discovery",
        tracks: [
          { id: 1, title: "One More Time", artists: [], isrc: "GBDUW0000053", duration: 320, genre: [], subgenre: [], disc_number: 1, track_number: 1 },
          { id: 2, title: "Aerodynamic", artists: [], isrc: null, duration: 212, genre: [], subgenre: [], disc_number: 1, track_number: 2 },
          { id: 3, title: "Unknown Slot", artists: [], isrc: null, duration: null, genre: [], subgenre: [], disc_number: null, track_number: null },
        ],
      }),
    },
    genres: { list: async () => ({ genres: [{ id: 1, name: "House", type: "main" }] }) },
    ...overrides,
  } as unknown as SonoVault;
}

async function connect(sv: SonoVault) {
  const server = createServer(sv);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("sonovault-mcp", () => {
  let client: Client;

  beforeAll(async () => {
    client = await connect(fakeSv());
  });

  it("lists all tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "browse_tracks",
        "get_artist_releases",
        "get_label_releases",
        "get_platform_links",
        "get_recordings_of_work",
        "get_release",
        "get_track",
        "get_work_codes",
        "list_genres",
        "lookup_isrc",
        "resolve_tracks",
        "search_artists",
        "search_labels",
        "search_releases",
        "search_tracks",
      ].sort(),
    );
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
    }
  });

  it("search_tracks returns track JSON", async () => {
    const result = await client.callTool({
      name: "search_tracks",
      arguments: { artist: "Daft Punk", title: "One More Time" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.results[0].isrc).toBe("GBDUW0000053");
    expect(result.isError).toBeFalsy();
  });

  it("get_work_codes passes isrc through", async () => {
    const result = await client.callTool({
      name: "get_work_codes",
      arguments: { isrc: "GBDUW0000053" },
    });
    const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(parsed.iswcs[0].iswc).toBe("T0710204399");
  });

  it("resolve_tracks accepts mixed item shapes", async () => {
    const result = await client.callTool({
      name: "resolve_tracks",
      arguments: { input_type: "isrc", items: ["GBDUW0000053"] },
    });
    const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(parsed.results[0].status).toBe("matched");
  });

  it("rejects invalid arguments via schema validation", async () => {
    const result = await client.callTool({
      name: "search_tracks",
      arguments: { artist: "Daft Punk" }, // missing required title
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toMatch(/validation|Invalid arguments/i);
  });

  it("surfaces API errors as tool errors, not protocol failures", async () => {
    const result = await client.callTool({ name: "browse_tracks", arguments: { genre: "House" } });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("Error");
  });

  it("get_release returns the tracklist with disc and track numbers", async () => {
    const result = await client.callTool({ name: "get_release", arguments: { id: 1 } });
    const body = JSON.parse((result as any).content[0].text);

    expect(body.tracks.map((t: any) => t.track_number)).toEqual([1, 2, null]);
    expect(body.tracks[0].disc_number).toBe(1);
  });

  it("get_release keeps an unknown position null rather than 0", async () => {
    const result = await client.callTool({ name: "get_release", arguments: { id: 1 } });
    const body = JSON.parse((result as any).content[0].text);

    const unknown = body.tracks.find((t: any) => t.title === "Unknown Slot");
    expect(unknown.track_number).toBeNull();
    expect(unknown.disc_number).toBeNull();
  });

  it("search_artists returns musicbrainz_id alongside wikidata_id", async () => {
    const result = await client.callTool({ name: "search_artists", arguments: { name: "Daft Punk" } });
    const body = JSON.parse((result as any).content[0].text);

    expect(body.results[0].musicbrainz_id).toBe("056e4f3e-d505-4dad-8ec1-d04f521cbb56");
    expect(body.results[0].wikidata_id).toBe("Q185828");
  });

  it("describes the tracklist ordering and the artist identifiers in the tool text", async () => {
    const { tools } = await client.listTools();
    const release = tools.find((t) => t.name === "get_release");
    const artists = tools.find((t) => t.name === "search_artists");

    expect(release?.description).toMatch(/playing order/);
    expect(release?.description).toMatch(/track_number/);
    expect(artists?.description).toMatch(/musicbrainz_id/);
  });
});

