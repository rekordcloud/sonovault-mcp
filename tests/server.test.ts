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
      search: async () => ({ results: [{ id: 1, name: "Daft Punk" }], next_cursor: null }),
      releases: async () => ({ results: [], next_cursor: null }),
    },
    labels: {
      search: async () => ({ results: [{ id: 10, name: "Virgin" }], next_cursor: null }),
      releases: async () => ({ results: [], next_cursor: null }),
    },
    releases: {
      search: async () => ({ results: [], next_cursor: null }),
      get: async () => ({ id: 1, title: "Discovery", tracks: [TRACK] }),
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
});
