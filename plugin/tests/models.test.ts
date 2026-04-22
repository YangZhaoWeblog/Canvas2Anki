import { describe, it, expect } from "vitest";
import {
  ANKI_CONNECT_URL,
  ANKI_CONNECT_VERSION,
  DEFAULT_DECK,
  type Card,
} from "../src/models";
import { readAnkiMeta, writeAnkiMeta, stripAnkiMeta } from "../src/models";

describe("models", () => {
  it("constants have correct values", () => {
    expect(ANKI_CONNECT_URL).toBe("http://127.0.0.1:8765");
    expect(ANKI_CONNECT_VERSION).toBe(6);
    expect(DEFAULT_DECK).toBe("Default");
  });

  it("Card interface accepts valid object", () => {
    const card: Card = {
      nodeId: "abc",
      front: "Q?",
      back: "A",
      deck: "Default",
      tags: ["test"],
      ankiId: null,
    };
    expect(card.nodeId).toBe("abc");
    expect(card.ankiId).toBeNull();
  });
});

describe("readAnkiMeta", () => {
  it("returns meta when canvas2anki field exists", () => {
    expect(readAnkiMeta({ canvas2anki: { id: 123 } })).toEqual({ id: 123 });
  });
  it("returns null when no canvas2anki field", () => {
    expect(readAnkiMeta({})).toBeNull();
  });
  it("returns null when id is wrong type", () => {
    expect(readAnkiMeta({ canvas2anki: { id: "string" } })).toBeNull();
  });
  it("returns null when canvas2anki is empty object", () => {
    expect(readAnkiMeta({ canvas2anki: {} })).toBeNull();
  });
});

describe("writeAnkiMeta", () => {
  it("adds canvas2anki to empty node", () => {
    const result = writeAnkiMeta({}, { id: 123 });
    expect(result).toEqual({ canvas2anki: { id: 123 } });
  });
  it("preserves existing fields", () => {
    const result = writeAnkiMeta({ text: "hello", color: "4" }, { id: 456 });
    expect(result).toEqual({ text: "hello", color: "4", canvas2anki: { id: 456 } });
  });
  it("overwrites existing canvas2anki", () => {
    const result = writeAnkiMeta({ canvas2anki: { id: 111 } }, { id: 222 });
    expect(result.canvas2anki).toEqual({ id: 222 });
  });
});

describe("stripAnkiMeta", () => {
  it("removes canvas2anki field", () => {
    const result = stripAnkiMeta({ text: "hello", canvas2anki: { id: 123 } });
    expect(result).toEqual({ text: "hello" });
    expect("canvas2anki" in result).toBe(false);
  });
  it("returns same shape when no canvas2anki", () => {
    const result = stripAnkiMeta({ text: "hello" });
    expect(result).toEqual({ text: "hello" });
  });
});
