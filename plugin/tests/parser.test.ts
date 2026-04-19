import { describe, it, expect } from "vitest";
import { parseCanvas } from "../src/parser";

const COLOR = "4";
const DELETE_KW = "DELETE";

function makeCanvas(nodes: any[], edges: any[] = []) {
  return JSON.stringify({ nodes, edges });
}

function textNode(id: string, text: string, color?: string, x = 0, y = 0) {
  return { id, type: "text", text, color, x, y, width: 100, height: 50 };
}

function fileNode(id: string, file: string, x = 0, y = 0) {
  return { id, type: "file", file, x, y, width: 100, height: 50 };
}

function groupNode(id: string, label: string, x: number, y: number, w: number, h: number) {
  return { id, type: "group", label, x, y, width: w, height: h };
}

describe("parseCanvas", () => {
  it("parses a simple green card", () => {
    const json = makeCanvas([textNode("n1", "Q?\n---\nA", COLOR)]);
    const { cards, warnings, deletions } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Q?");
    expect(cards[0].back).toBe("A");
    expect(cards[0].deck).toBe("Default");
    expect(cards[0].ankiId).toBeNull();
  });

  it("skips non-matching color nodes", () => {
    const json = makeCanvas([textNode("n1", "Q?\n---\nA", "1")]);
    const { cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards).toHaveLength(0);
  });

  it("warns on green node without separator", () => {
    const json = makeCanvas([textNode("n1", "no separator here", COLOR)]);
    const { cards, warnings } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });

  it("extracts existing anki ID from metadata", () => {
    const json = makeCanvas([
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":12345}-->', COLOR),
    ]);
    const { cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards[0].ankiId).toBe(12345);
  });

  it("deletes matching-color node with ankiId and DELETE keyword", () => {
    const json = makeCanvas([
      textNode("n1", 'DELETE\nQ?\n---\nA\n<!--card:{"id":99999}-->', COLOR),
    ]);
    const { deletions, cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].ankiId).toBe(99999);
    expect(cards).toHaveLength(0);
  });

  it("does NOT delete non-matching color even with ankiId", () => {
    const json = makeCanvas([
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":88888}-->'),
    ]);
    const { deletions, cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(deletions).toHaveLength(0);
    expect(cards).toHaveLength(0);
  });

  it("does NOT delete matching-color node with ankiId but no DELETE keyword", () => {
    const json = makeCanvas([
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":77777}-->', COLOR),
    ]);
    const { deletions, cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(deletions).toHaveLength(0);
    expect(cards).toHaveLength(1);
    expect(cards[0].ankiId).toBe(77777);
  });

  it("appends edge targets to back, sorted by y", () => {
    const json = makeCanvas(
      [
        textNode("card", "Q?\n---\nA", COLOR),
        fileNode("img", "附件/photo.png", 300, 50),
        textNode("txt", "extra info", undefined, 300, 200),
      ],
      [
        { id: "e1", fromNode: "card", toNode: "img" },
        { id: "e2", fromNode: "card", toNode: "txt" },
      ]
    );
    const { cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards[0].back).toContain("![[附件/photo.png]]");
    expect(cards[0].back).toContain("extra info");
    const imgPos = cards[0].back.indexOf("![[附件/photo.png]]");
    const txtPos = cards[0].back.indexOf("extra info");
    expect(imgPos).toBeLessThan(txtPos);
  });

  it("maps card to group deck by containment", () => {
    const json = makeCanvas([
      groupNode("g1", "ALL::密码学", -100, -100, 500, 400),
      textNode("n1", "Q?\n---\nA", COLOR, 0, 0),
    ]);
    const { cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards[0].deck).toBe("ALL::密码学");
  });

  it("extracts hashtags from front and back", () => {
    const json = makeCanvas([
      textNode("n1", "#crypto Q?\n---\n#pki A", COLOR),
    ]);
    const { cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards[0].tags).toContain("crypto");
    expect(cards[0].tags).toContain("pki");
    expect(cards[0].front).not.toContain("#crypto");
  });

  it("skips --- inside code fences", () => {
    const text = "Question\n\n```yaml\ndoc1: a\n---\ndoc2: b\n```\n---\nAnswer";
    const json = makeCanvas([textNode("n1", text, COLOR)]);
    const { cards } = parseCanvas(json, COLOR, DELETE_KW);
    expect(cards[0].front).toContain("```yaml");
    expect(cards[0].back.trim()).toBe("Answer");
  });
});
