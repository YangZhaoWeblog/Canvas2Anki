# Code Review

> status: active
> owner: code-review
> layer: universal
> 本文件负责评审标准；不负责测试实现细节。

## Required Focus

- Correctness and behavior changes.
- Compatibility and migration risk.
- Layering and ownership.
- Error handling and observability.
- Tests and verification evidence.
- User-data side effects in Canvas JSON and Anki notes.

## Review Rules

- Findings first, ordered by severity.
- Reference files and lines.
- Distinguish blockers from notes.
- Do not use author self-review as a substitute for independent review on non-trivial changes.
- PGE tasks require independent Evaluator review before close; if unavailable, record fallback and residual risk.

## Project-Specific Checks

- Deletion must remain explicit through DELETE group membership and existing Anki ID.
- Metadata writeback must preserve unrelated Canvas fields.
- Converter changes must cover math, code, links, images, and tag interactions when affected.
- AnkiConnect changes must state whether live Anki verification was run or intentionally skipped.
- CLI changes must be explicit; avoid accidental divergence fixes unless requested.

## Reject Reasons

- Unverified behavior.
- Missing regression test for bug fix.
- Public API or metadata change without owner documentation.
- Unrelated rewrite or formatting noise.
- Workflow gate or circuit breaker bypass.
- PGE Generator / Evaluator silently collapsed into one role on medium+ work.
