# Glossary

> status: active
> owner: glossary
> layer: universal
> 本文件负责项目术语；不负责工作流或实现规则。

## Terms

| Term | Meaning | Notes |
|---|---|---|
| Canvas2Anki | Obsidian plugin that exports Canvas nodes to Anki cards | Active product surface is `plugin/` |
| Canvas node | Obsidian Canvas JSON node | Text nodes can become cards |
| Export color | Canvas preset color marking nodes for export | Default is color `4` |
| Q/A separator | First bare `---` outside code fences | Splits front and back |
| Canvas Group | Canvas group whose label maps to Anki deck | Smallest containing group wins |
| DELETE Group | Group label that triggers explicit deletion | Default label is `DELETE` |
| AnkiConnect | Local Anki plugin HTTP API | Requires CORS for Obsidian |
| Anki ID | Anki note ID stored in Canvas metadata | `node.canvas2anki.id` |
| CLI | Python prototype in `cli/` | Frozen unless explicitly targeted |
| PGE | Planner / Generator / Evaluator workflow | Used for medium+ or critical work |

## Project Growth TODO

- [ ] Add terms from future user-facing settings or metadata versions.
- [ ] Mark ambiguous terms and choose canonical names.
