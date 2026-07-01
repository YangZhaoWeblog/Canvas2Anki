# Workflow Gates

> status: active
> owner: execution-gates
> layer: universal
> 本文件负责执行门禁；不负责具体主题的实现规则。

## Context Gate

Read the smallest context that can make the next decision safe: `AGENTS.md`, relevant harness files, target files, nearby tests, and relevant failure notes.

For plugin behavior, include the corresponding `plugin/tests/*.test.ts` file. For frozen CLI behavior, include the corresponding `cli/tests/test_*.py` file before changing `cli/`.

## Size & Risk Gate

- Small: local bug/config/doc change, usually 1-3 files.
- Medium: multi-file feature, public interface, metadata format, exporter/parser/converter flow, or external-service behavior.
- Large: new module, cross-module change, new dependency, migration-like metadata change, or high-risk workflow.

Escalate when scope grows, when public API/metadata/deployment changes appear, or when the work starts crossing ownership boundaries.

## Path Gate

Small work may proceed after Coding Start Check. Medium+ and critical-flow work must use the relevant protocol in `pge-protocol.md` or a project-specific design process, then return to Verify and Close.

Critical flows include Canvas parsing, Anki note creation/update/delete, Canvas JSON writeback, and Markdown-to-HTML/media conversion.

## Coding Start Check

Before production code:

1. Confirm branch is not protected: unknown.
2. Check worktree and preserve unrelated user changes.
3. Confirm required context and design artifacts exist.
4. Confirm verification strategy.

## Dirty Worktree Protocol

- Treat existing changes as user work.
- Read relevant diffs before editing touched files.
- Avoid unrelated formatting.
- Ask before destructive actions.

## Verification Gate

Run the smallest meaningful verification for the change. Record commands and results. Do not silently skip required verification.

Default choices:

- Plugin logic: `cd plugin && npm test`
- Plugin type/build behavior: `cd plugin && npm run build`
- CLI behavior: `cd cli && pytest`
- Docs-only harness changes: inspect diff and links; no product test required unless content changes commands or contracts.

## Circuit Breaker Gate

If the same interface or flow fails 3 rounds of tests, reference alignment, or review, stop implementation and return to design or clarification.

## Commit Gate

Before commit, confirm Coding Start Check still holds, verification ran, review requirements are satisfied, and no unrelated files are included.
