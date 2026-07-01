# Testing

> status: active
> owner: testing
> layer: universal
> 本文件负责测试策略和验证证据；不负责代码评审。

## Core Rules

- Add regression tests for bug fixes.
- Prefer focused tests near changed code.
- Use integration tests when behavior crosses parsing, conversion, writeback, or external-service boundaries.
- Record `verify_cmd` for non-trivial changes.
- Do not weaken existing assertions to pass new code.

## Project Commands

| Area | Command |
|---|---|
| Plugin unit tests | `cd plugin && npm test` |
| Plugin typecheck/build | `cd plugin && npm run build` |
| CLI tests | `cd cli && pytest` |

## TDD

For risky behavior, start with a failing test or tracer bullet before broad implementation.

For PGE tasks, TDD is owned by the Generator:

- one behavior test or tracer bullet at a time;
- confirm RED before implementation when an automated test is possible;
- if no automated test is feasible, record why and use the smallest manual verification cut;
- Evaluator must check that tests were not weakened.

## Verification Selection

- Docs only: inspect diff and links.
- Plugin parser/converter/models: targeted Vitest file, then `cd plugin && npm test` when behavior is shared.
- Plugin type/API/runtime boundary: `cd plugin && npm run build`.
- Exporter or AnkiConnect behavior: focused tests plus a manual verification note when external Anki behavior cannot be automated.
- CLI behavior: `cd cli && pytest`.

## Test Data

- Prefer small Canvas JSON fixtures that isolate color, group, edge, tag, and metadata behavior.
- External AnkiConnect calls should be faked in automated tests unless the task explicitly asks for live integration.

## Project Growth TODO

- [ ] Define manual AnkiConnect smoke-test steps.
- [ ] Decide whether coverage thresholds are required.
