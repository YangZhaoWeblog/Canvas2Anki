import { describe, it, expect } from "vitest";
import {
  ANKI_CONNECT_URL,
  ANKI_CONNECT_VERSION,
  CARD_META_RE,
  DEFAULT_DECK,
  parseMeta,
  stripMeta,
  writeMeta,
  type Card,
} from "../src/models";

describe("models", () => {
  it("constants have correct values", () => {
    expect(ANKI_CONNECT_URL).toBe("http://127.0.0.1:8765");
    expect(ANKI_CONNECT_VERSION).toBe(6);
    expect(DEFAULT_DECK).toBe("Default");
  });

  it("CARD_META_RE extracts JSON from comment", () => {
    const text = 'some text\n<!--card:{"id":123}-->';
    const match = text.match(CARD_META_RE);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1])).toEqual({ id: 123 });
  });

  it("CARD_META_RE does not match plain comments", () => {
    const text = "<!-- normal comment -->";
    expect(text.match(CARD_META_RE)).toBeNull();
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

describe("parseMeta", () => {
  it("parses existing metadata", () => {
    const text = 'hello\n<!--card:{"id":123,"anc":"abc"}-->';
    expect(parseMeta(text)).toEqual({ id: 123, anc: "abc" });
  });

  it("returns {} when no metadata", () => {
    expect(parseMeta("plain text")).toEqual({});
  });
});

describe("stripMeta", () => {
  it("removes metadata comment", () => {
    const text = 'hello\n<!--card:{"id":123}-->';
    expect(stripMeta(text)).toBe("hello");
  });
});

describe("writeMeta", () => {
  it("merges new fields into existing metadata", () => {
    const text = 'hello\n<!--card:{"anc":"abc"}-->';
    const result = writeMeta(text, { id: 999 });
    expect(result).toContain("hello");
    expect(result).toContain('"anc":"abc"');
    expect(result).toContain('"id":999');
  });

  it("overwrites existing field", () => {
    const text = 'hello\n<!--card:{"id":111}-->';
    const result = writeMeta(text, { id: 222 });
    expect(result).toContain('"id":222');
    expect(result).not.toContain('"id":111');
  });

  it("works on text with no existing metadata", () => {
    const result = writeMeta("hello", { id: 1 });
    expect(result).toBe('hello\n<!--card:{"id":1}-->');
  });
});
