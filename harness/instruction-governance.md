# Instruction Governance

> status: active
> owner: instruction-governance
> layer: universal
> 本文件负责规则归属和 harness 演进；不负责执行门禁。

## Placement Rules

- Put high-frequency hard constraints and workflow routing in `AGENTS.md`.
- Put topic rules in focused `harness/*.md` files.
- Put task-specific plans in project docs, not permanent harness.
- Put real incidents and lessons in `failures.md`.
- Keep `project-grown` rules for lessons proven by this repository after real feedback.

## Layers

- `universal`: cross-project execution and governance.
- `profile`: activated by project type, stack, API, dependencies, deployment, or large workflow.
- `project-grown`: local rules proven by this project after real feedback.

## Good Pattern

- Short entrypoint.
- One owner per rule.
- Topic files with narrow scope.
- Failures recorded before abstracting new rules.
- Tables only when they reduce reading cost.

## Bad Pattern

- Adding every new rule to `AGENTS.md`.
- Copying the same rule across files.
- Keeping vague slogans without triggers or actions.
- Letting examples become longer than rules.
- Marking rules as `project-grown` before there is project evidence.

## Maintenance

When a harness file grows too large or starts owning multiple topics, split by owner rather than adding more sections.
