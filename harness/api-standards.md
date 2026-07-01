# API Standards

> status: active
> owner: api-standards
> layer: profile
> 本文件负责公开接口和兼容性规则；不负责业务逻辑实现。

## Interfaces

This project has several public or semi-public contracts:

- Obsidian command and ribbon entry: `Canvas2Anki: Export current canvas`.
- Obsidian settings: export color and delete group label.
- Canvas JSON metadata: top-level `node.canvas2anki = { id: <anki_note_id> }`.
- AnkiConnect requests: version check, deck creation, note add/update/delete, media upload.
- Markdown and Canvas parsing semantics documented in `README.md` and `docs/design-spec.md`.

## Core Rules

- Preserve compatibility unless a breaking change is explicitly approved.
- Keep Canvas metadata forward-compatible; do not repurpose existing `canvas2anki.id`.
- Deletion remains explicit: DELETE group membership plus existing Anki ID. Export color must not trigger deletion.
- Keep AnkiConnect request/response handling in `plugin/src/anki-client.ts`.
- Document request/response or behavior changes in README/design docs when user-visible.
- Keep generated/build files out of manual edits unless the task is specifically about release artifacts.

## Error Surface

- AnkiConnect unavailable: fail the export before mutating cards and show a user-facing error.
- Per-card add/update/delete failure: warn and continue when existing behavior supports partial progress.
- Missing media: skip or warn without blocking unrelated cards.

## Project Growth TODO

- [ ] Define a formal compatibility policy for Canvas metadata V2.
- [ ] Document live AnkiConnect manual-test expectations.
