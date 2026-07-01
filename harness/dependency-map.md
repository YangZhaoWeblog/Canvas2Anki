# Dependency Map

> status: active
> owner: dependency-map
> layer: profile
> 本文件负责上游/下游依赖和模块边界规则；不负责部署。

## External Dependencies

| Dependency | Used by | Notes |
|---|---|---|
| Obsidian plugin API | `plugin/src/main.ts`, settings/runtime code | Runtime host and UI surface |
| Obsidian Canvas JSON | parser/exporter/writeback flow | User data; preserve unknown fields |
| AnkiConnect | `plugin/src/anki-client.ts` | External HTTP API at `127.0.0.1:8765` |
| Anki | Manual/runtime verification | Notes, decks, media, review state |
| `marked` | `plugin/src/converter.ts` | Markdown-to-HTML conversion |
| esbuild / TypeScript / Vitest | plugin build and tests | Dev/build dependencies |
| Python `mistune`, `pytest` | `cli/` prototype | CLI dependency set |

## Module Boundaries

- `plugin/src/parser.ts`: Canvas JSON to project card model.
- `plugin/src/converter.ts`: Markdown/wiki-link/math/code/media HTML conversion.
- `plugin/src/anki-client.ts`: AnkiConnect transport and payloads.
- `plugin/src/exporter.ts`: orchestration across parser, converter, Anki, and writeback.
- `plugin/src/settings.ts`: Obsidian settings UI and defaults.
- `plugin/src/models.ts`: shared interfaces and constants.

## Rules

- Keep external dependencies isolated behind existing modules.
- Preserve unknown Canvas JSON fields during writeback.
- Make external-service failure modes explicit and test fakes around them.
- Do not add new runtime dependencies without explaining why local helpers are insufficient.

## Project Growth TODO

- [ ] Add exact timeout/retry policy for AnkiConnect if the implementation supports it.
- [ ] Document media file search behavior as fixtures after the next media change.
