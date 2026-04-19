import { describe, it, expect } from "vitest";
import {
  ANKI_CONNECT_URL,
  ANKI_CONNECT_VERSION,
  CARD_META_RE,
  DEFAULT_DECK,
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
