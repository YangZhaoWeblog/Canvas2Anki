# Coding Style

> status: active
> owner: coding-style
> layer: profile
> 本文件负责代码结构和风格；不负责测试、评审或部署。

## General

- Follow existing project style before inventing abstractions.
- Keep edits scoped to the requested behavior.
- Prefer clear names and small functions.
- Avoid unrelated refactors.
- Use the language already present in the touched file for user-facing strings and docs.

## Architecture

- Treat `plugin/` as the active product surface.
- Treat `cli/` as prototype/frozen unless the task explicitly targets CLI behavior.
- Keep parser, converter, Anki client, exporter, settings, and models responsibilities separated as they are under `plugin/src/`.
- Put shared TypeScript types and constants in `plugin/src/models.ts` when they describe cross-module contracts.
- Keep Obsidian API usage near plugin/runtime boundaries; keep pure parsing and conversion logic testable without Obsidian.
- Keep AnkiConnect calls behind `plugin/src/anki-client.ts`; exporter orchestration should not hand-roll HTTP calls.

## TypeScript

- Preserve `strict`, `noImplicitAny`, and isolated module compatibility.
- Prefer explicit interfaces for Canvas, Card, and Anki payload shapes when values cross module boundaries.
- Do not weaken tests or types to fit an implementation.

## Python CLI

- Keep changes minimal and compatible with existing pytest coverage.
- Do not port plugin-only features back to CLI unless explicitly requested.

## Errors & Logging

- Surface user-facing plugin failures through Obsidian notices where existing code does so.
- Use warnings for per-card recoverable failures; avoid aborting a batch unless the dependency or precondition blocks all exports.
- Avoid debug prints in committed code.

## Project Growth TODO

- [ ] Decide whether a formatter/linter should become part of the workflow.
- [ ] Capture exact user-facing error language conventions after the next behavior change.
