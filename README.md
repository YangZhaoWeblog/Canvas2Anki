# Canvas2Anki

> Give your canvas nodes the green light — export to Anki in one click.

Turn color-marked [Obsidian Canvas](https://obsidian.md) nodes into Anki flashcards via [AnkiConnect](https://ankiweb.net/shared/info/2055492159).

## How It Works

```
Canvas node (color 4)          Anki card
┌──────────────────┐           ┌──────────────┐
│ What is ECDSA?   │   ──►     │ Front: ...   │
│ ---              │           │ Back:  ...   │
│ A signing scheme │           │ Deck:  密码学 │
│ using EC + DSA   │           │ Tags:  crypto │
└──────────────────┘           └──────────────┘
```

- **Color = export flag.** Pick one of Canvas's 6 preset colors in settings. Only nodes with that color are exported.
- **`---` = Q/A separator.** First bare `---` (not inside code fences) splits front and back.
- **Canvas Group = Anki Deck.** The group label becomes the deck name.
- **`#tags`** in node text become Anki tags (and are stripped from card content).
- **Edges = append.** Arrows from a card node to other nodes append their content to the back (images as `![[]]`, text inline).
- **`DELETE` = explicit delete.** Write `DELETE` in a card node to remove its Anki counterpart on next export. No implicit deletion — changing the export color won't mass-delete your review progress.

## Install

### Prerequisites

1. [Anki](https://apps.ankiweb.net/) with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) installed
2. AnkiConnect CORS configured for Obsidian:
   ```json
   {
     "webCorsOriginList": ["app://obsidian.md"]
   }
   ```
3. An Anki note type named **问答题** with fields **正面** and **背面** (hardcoded in v0.1)

### Plugin

Not yet in the community plugin directory. Manual install:

```bash
git clone https://github.com/yangzhao/canvas2anki.git
cd canvas2anki/plugin
npm install && npm run build
```

Then symlink or copy `plugin/main.js`, `plugin/manifest.json` into your vault's `.obsidian/plugins/canvas2anki/`.

## Usage

1. Open a Canvas file in Obsidian
2. Mark nodes with your export color (default: color 4, green in default theme)
3. Write Q/A content with `---` as separator
4. Click the ribbon icon or run `Canvas2Anki: Export current canvas` from the command palette
5. Done. A toast shows: `✓ 3 added, 1 updated, 0 deleted, 0 skipped`

### Deleting Cards

Write `DELETE` anywhere in a card node's text, then export. The Anki note is deleted and the metadata + keyword are cleaned up. The delete keyword is configurable in settings.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Export color | 4 (green) | Which Canvas preset color (1-6) marks export nodes. Shown as color swatches from your current theme. |
| Delete keyword | `DELETE` | Text that triggers Anki card deletion on export |

That's it. Note type and field names are hardcoded (`问答题` / `正面` / `背面`).

## Metadata

After export, each node gets an invisible HTML comment:

```
<!--card:{"id":1776596734851}-->
```

This links the Canvas node to its Anki note. Don't delete it manually — the plugin manages it.

## Project Structure

```
canvas2anki/
├── plugin/          Obsidian plugin (TypeScript)
│   ├── src/
│   │   ├── main.ts          Plugin entry, ribbon/command registration
│   │   ├── settings.ts      Settings tab with color swatches
│   │   ├── parser.ts        Canvas JSON → Card[]
│   │   ├── converter.ts     Markdown → Anki HTML
│   │   ├── anki-client.ts   AnkiConnect HTTP client
│   │   ├── exporter.ts      Orchestration: parse → convert → upload
│   │   └── models.ts        Interfaces & constants
│   └── tests/               32 tests (vitest)
└── cli/             Python CLI (prototype, frozen)
```

## Development

```bash
cd plugin
npm install
npm run dev          # watch mode
npm run build        # production build
npm test             # run tests
```

## License

MIT
