import { describe, it, expect } from "vitest";
import { mdToAnkiHtml } from "../src/converter";

describe("mdToAnkiHtml", () => {
  it("converts plain text to paragraph", () => {
    expect(mdToAnkiHtml("hello")).toContain("hello");
  });

  it("converts bold", () => {
    const html = mdToAnkiHtml("**bold**");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("protects inline math $...$", () => {
    const html = mdToAnkiHtml("$x^2$");
    expect(html).toContain("\\(x^2\\)");
    expect(html).not.toContain("$");
  });

  it("protects block math $$...$$", () => {
    const html = mdToAnkiHtml("$$\\sum_{i=1}^n$$");
    expect(html).toContain("\\[\\sum_{i=1}^n\\]");
  });

  it("protects code blocks from markdown processing", () => {
    const html = mdToAnkiHtml("```\ncode\n```");
    expect(html).toContain("<pre><code>");
    expect(html).toContain("code");
  });

  it("protects inline code", () => {
    const html = mdToAnkiHtml("`x = 1`");
    expect(html).toContain("<code>x = 1</code>");
  });

  it("converts ==highlight== to <mark>", () => {
    const html = mdToAnkiHtml("==important==");
    expect(html).toContain("<mark>important</mark>");
  });

  it("converts image wikilink to <img>", () => {
    const html = mdToAnkiHtml("![[附件/photo.png]]");
    expect(html).toContain('<img src="photo.png">');
  });

  it("converts note wikilink to obsidian URI", () => {
    const html = mdToAnkiHtml("[[ECDSA]]", "MyVault");
    expect(html).toContain('href="obsidian://open?vault=MyVault');
    expect(html).toContain("ECDSA");
  });

  it("converts markdown table to HTML table", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const html = mdToAnkiHtml(md);
    expect(html).toContain("<table");
    expect(html).toContain("<td>");
  });

  it("does not corrupt math with underscores", () => {
    const html = mdToAnkiHtml("$a_{i}$");
    expect(html).toContain("\\(a_{i}\\)");
    expect(html).not.toContain("<em>");
  });
});
