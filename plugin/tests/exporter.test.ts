import { describe, it, expect, vi } from "vitest";
import { exportCanvas } from "../src/exporter";
import type { PluginSettings } from "../src/models";

const SETTINGS: PluginSettings = {
  colorR: 64,
  colorG: 196,
  colorB: 104,
  modelName: "问答题",
  frontField: "正面",
  backField: "背面",
};

function makeCanvas(nodes: any[], edges: any[] = []) {
  return JSON.stringify({ nodes, edges });
}

describe("exportCanvas", () => {
  it("returns stats for new card", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text", color: "#40c468",
        text: "Q?\n---\nA", x: 0, y: 0, width: 100, height: 50,
      },
    ]);

    const mockClient = {
      version: vi.fn(),
      createDeck: vi.fn(),
      addNote: vi.fn().mockResolvedValue(99999),
      updateNoteFields: vi.fn(),
      deleteNotes: vi.fn(),
      storeMediaFile: vi.fn(),
    };

    const result = await exportCanvas({
      canvasJson: json,
      client: mockClient as any,
      settings: SETTINGS,
      vaultName: "TestVault",
      canvasPath: "test.canvas",
      readBinary: async () => null,
      findFile: () => null,
    });

    expect(result.stats.added).toBe(1);
    expect(result.stats.updated).toBe(0);
    expect(result.idWriteback).toHaveProperty("n1", 99999);
    expect(mockClient.addNote).toHaveBeenCalledOnce();
  });

  it("updates existing card with ankiId", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text", color: "#40c468",
        text: 'Q?\n---\nA\n<!--card:{"id":12345}-->',
        x: 0, y: 0, width: 100, height: 50,
      },
    ]);

    const mockClient = {
      version: vi.fn(),
      createDeck: vi.fn(),
      addNote: vi.fn(),
      updateNoteFields: vi.fn(),
      deleteNotes: vi.fn(),
      storeMediaFile: vi.fn(),
    };

    const result = await exportCanvas({
      canvasJson: json,
      client: mockClient as any,
      settings: SETTINGS,
      vaultName: "TestVault",
      canvasPath: "test.canvas",
      readBinary: async () => null,
      findFile: () => null,
    });

    expect(result.stats.updated).toBe(1);
    expect(mockClient.updateNoteFields).toHaveBeenCalledOnce();
    expect(mockClient.addNote).not.toHaveBeenCalled();
  });

  it("handles addNote failure gracefully", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text", color: "#40c468",
        text: "Q?\n---\nA", x: 0, y: 0, width: 100, height: 50,
      },
    ]);

    const mockClient = {
      version: vi.fn(),
      createDeck: vi.fn(),
      addNote: vi.fn().mockRejectedValue(new Error("duplicate")),
      updateNoteFields: vi.fn(),
      deleteNotes: vi.fn(),
      storeMediaFile: vi.fn(),
    };

    const result = await exportCanvas({
      canvasJson: json,
      client: mockClient as any,
      settings: SETTINGS,
      vaultName: "TestVault",
      canvasPath: "test.canvas",
      readBinary: async () => null,
      findFile: () => null,
    });

    expect(result.stats.skipped).toBe(1);
    expect(result.idWriteback).not.toHaveProperty("n1");
  });

  it("processes deletion candidates", async () => {
    const json = makeCanvas([
      {
        id: "n1", type: "text",
        text: 'old\n---\nstuff\n<!--card:{"id":77777}-->',
        x: 0, y: 0, width: 100, height: 50,
      },
    ]);

    const mockClient = {
      version: vi.fn(),
      createDeck: vi.fn(),
      addNote: vi.fn(),
      updateNoteFields: vi.fn(),
      deleteNotes: vi.fn(),
      storeMediaFile: vi.fn(),
    };

    const result = await exportCanvas({
      canvasJson: json,
      client: mockClient as any,
      settings: SETTINGS,
      vaultName: "TestVault",
      canvasPath: "test.canvas",
      readBinary: async () => null,
      findFile: () => null,
    });

    expect(result.stats.deleted).toBe(1);
    expect(mockClient.deleteNotes).toHaveBeenCalledWith([77777]);
    expect(result.deletedNodeIds).toContain("n1");
  });
});
