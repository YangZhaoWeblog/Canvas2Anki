import { describe, it, expect, vi } from "vitest";
import { exportCanvas } from "../src/exporter";
import type { PluginSettings } from "../src/models";

const SETTINGS: PluginSettings = {
  exportColor: "4",
  deleteGroupLabel: "DELETE",
};

function makeCanvas(nodes: any[], edges: any[] = []) {
  return JSON.stringify({ nodes, edges });
}

function makeMockClient() {
  return {
    version: vi.fn(),
    createDeck: vi.fn(),
    addNote: vi.fn().mockResolvedValue(99999),
    updateNoteFields: vi.fn(),
    deleteNotes: vi.fn(),
    storeMediaFile: vi.fn(),
  };
}

function makeParams(json: string, client: any) {
  return {
    canvasJson: json,
    client: client as any,
    settings: SETTINGS,
    vaultName: "TestVault",
    canvasPath: "test.canvas",
    readBinary: async () => null as ArrayBuffer | null,
    findFile: () => null as string | null,
  };
}

describe("exportCanvas", () => {
  it("returns stats for new card", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text", color: "4",
        text: "Q?\n---\nA", x: 0, y: 0, width: 100, height: 50,
      },
    ]);
    const client = makeMockClient();
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.added).toBe(1);
    expect(result.stats.updated).toBe(0);
    expect(result.idWriteback).toHaveProperty("n1", 99999);
    expect(client.addNote).toHaveBeenCalledOnce();
  });

  it("updates existing card with ankiId", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text", color: "4",
        text: 'Q?\n---\nA\n<!--card:{"id":12345}-->',
        x: 0, y: 0, width: 100, height: 50,
      },
    ]);
    const client = makeMockClient();
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.updated).toBe(1);
    expect(client.updateNoteFields).toHaveBeenCalledOnce();
    expect(client.addNote).not.toHaveBeenCalled();
  });

  it("handles addNote failure gracefully", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text", color: "4",
        text: "Q?\n---\nA", x: 0, y: 0, width: 100, height: 50,
      },
    ]);
    const client = makeMockClient();
    client.addNote.mockRejectedValue(new Error("duplicate"));
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.skipped).toBe(1);
    expect(result.idWriteback).not.toHaveProperty("n1");
  });

  it("deletes card in DELETE group with ankiId", async () => {
    const json = JSON.stringify({
      nodes: [
        { id: "dg", type: "group", label: "DELETE", x: -200, y: -200, width: 1000, height: 1000 },
        { id: "n1", type: "text", color: "4",
          text: 'Q?\n---\nA\n<!--card:{"id":77777}-->',
          x: 0, y: 0, width: 100, height: 50 },
      ],
      edges: [],
    });
    const client = makeMockClient();
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.deleted).toBe(1);
    expect(client.deleteNotes).toHaveBeenCalledWith([77777]);
    expect(result.deletedNodeIds).toContain("n1");
  });

  it("skips node in DELETE group with no ankiId, counts as warning", async () => {
    const json = JSON.stringify({
      nodes: [
        { id: "dg", type: "group", label: "DELETE", x: -200, y: -200, width: 1000, height: 1000 },
        { id: "n1", type: "text", color: "4",
          text: "Q?\n---\nA",
          x: 0, y: 0, width: 100, height: 50 },
      ],
      edges: [],
    });
    const client = makeMockClient();
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.deleted).toBe(0);
    expect(result.stats.skipped).toBe(1);
    expect(client.deleteNotes).not.toHaveBeenCalled();
  });

  it("handles deleteNotes failure gracefully, continues to next", async () => {
    const json = JSON.stringify({
      nodes: [
        { id: "dg", type: "group", label: "DELETE", x: -200, y: -200, width: 1000, height: 1000 },
        { id: "n1", type: "text", color: "4",
          text: 'Q1?\n---\nA1\n<!--card:{"id":11111}-->',
          x: 0, y: 0, width: 100, height: 50 },
        { id: "n2", type: "text", color: "4",
          text: 'Q2?\n---\nA2\n<!--card:{"id":22222}-->',
          x: 0, y: 100, width: 100, height: 50 },
      ],
      edges: [],
    });
    const client = makeMockClient();
    client.deleteNotes
      .mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce(undefined);
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.deleted).toBe(1);
    expect(result.stats.skipped).toBe(1);
    expect(client.deleteNotes).toHaveBeenCalledTimes(2);
    expect(result.deletedNodeIds).toHaveLength(1);
  });
});
