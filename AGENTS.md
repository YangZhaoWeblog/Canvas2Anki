# Canvas2Anki

> AI Agent entrypoint: keep project identity, hard constraints, workflow routing, and index here. Details live in `harness/*.md`.

## Identity

- **Project**: `Canvas2Anki`
- **Purpose**: Export color-marked Obsidian Canvas nodes to Anki cards through AnkiConnect.
- **Repo type**: code project
- **AI role**: Senior engineer for this repository; follow local architecture, workflow gates, and quality standards.

## Stack

- **Language / framework**: TypeScript Obsidian plugin, Python prototype CLI
- **Entrypoints**: `plugin/src/main.ts`, `cli/canvas2anki.py`
- **Package / module**: `plugin/package.json`; `cli/requirements.txt`

## Commands

- Verify: `cd plugin && npm test`; `cd plugin && npm run build`; `cd cli && pytest`
- Generate: `cd plugin && npm run build`
- Run locally: `cd plugin && npm run dev`
- Local environment details: [development.md](harness/development.md)

## Structure

```text
plugin/   Obsidian plugin source, tests, build config, manifest
cli/      Python prototype CLI, frozen unless explicitly requested
docs/     Design notes, specs, plans, and PGE templates
harness/  AI-agent operating rules for this repository
```

Do not add new top-level directories unless the user or project convention explicitly requires it.

## Rules

1. Start implementation by stating one-sentence goal and up to 3 clarification TODOs; write `无待澄清` when clear.
2. Respect existing local changes. Never revert unrelated user work.
3. Prefer the TypeScript plugin as the active product surface; treat `cli/` as prototype/frozen unless the task explicitly targets it.
4. Follow the project layering and ownership rules in [coding-style.md](harness/coding-style.md).
5. Route AnkiConnect, Obsidian, dependency, deployment, and test changes to their owner harness files.
6. Write project-facing docs and comments in the language already used by the touched file.
7. Before writing production code, pass Coding Start Check in [workflow-gates.md](harness/workflow-gates.md).
8. Medium+ work enters PGE in Path stage; if Generator / Evaluator cannot be independent, record fallback instead of silently working solo.
9. Before final delivery or commit, run verification appropriate to the change and record commands.

## Task Routing

| Scenario | Entry action | Reference |
|---|---|---|
| Local setup / commands | Read local runbook | [development.md](harness/development.md) |
| Medium+ work / critical flow | Follow main workflow; enter large-work protocol in Path stage when applicable | [pge-protocol.md](harness/pge-protocol.md) |
| AnkiConnect, command, settings, metadata, or Canvas JSON contract change | Update API/interface rules and tests | [api-standards.md](harness/api-standards.md) |
| Persistence or schema-like metadata change | Confirm whether it is Canvas JSON metadata or true DB work | [database.md](harness/database.md) |
| Obsidian, AnkiConnect, npm, Python, or module-boundary change | Use dependency owner rules | [dependency-map.md](harness/dependency-map.md) |
| Manual install, build output, release, or plugin packaging | Use deployment owner rules | [deployment.md](harness/deployment.md) |
| Review / validation | Use review and testing rules | [code-review.md](harness/code-review.md), [testing.md](harness/testing.md) |

## Workflow

All tasks follow one main workflow. Topic-specific protocols are subflows, not bypasses.

1. **Intake**: capture goal and clarification TODOs.
2. **Context**: read this file, relevant harness files, target files, tests, and failure notes.
3. **Size & Risk**: classify small / medium / large and detect API, DB, dependency, deployment, or critical-flow risk.
4. **Path**: small work may proceed directly; medium+ or critical work enters the relevant subflow and then returns here.
5. **Verify**: pass Coding Start Check before code; run scoped verification after changes.
6. **Circuit Breaker**: if the same interface / flow fails 3 rounds of tests, reference alignment, or review, stop and return to design / clarification.
7. **Close**: summarize changes, verification, remaining risk, and follow-up.

## Change Governance

Rule growth, ownership, and harness maintenance are governed by [instruction-governance.md](harness/instruction-governance.md).

## Index

| Topic | Use when | File |
|---|---|---|
| Local development | tools, commands, local run/debug | [development.md](harness/development.md) |
| Workflow gates | context, sizing, start, verify, commit, circuit breaker | [workflow-gates.md](harness/workflow-gates.md) |
| Instruction governance | rule ownership and harness evolution | [instruction-governance.md](harness/instruction-governance.md) |
| Coding style | architecture, naming, layering | [coding-style.md](harness/coding-style.md) |
| Testing | unit, integration, regression, verification evidence | [testing.md](harness/testing.md) |
| Code review | independent review, checklist, reject reasons | [code-review.md](harness/code-review.md) |
| Large-work protocol | contracts, generator/evaluator, fallback, circuit breaker | [pge-protocol.md](harness/pge-protocol.md) |
| PGE agents | generator/evaluator execution prompts | [.codex/agents/](.codex/agents/) |
| PGE templates | sprint contract and evaluator report | [docs/pge/](docs/pge/) |
| API | AnkiConnect, command/settings contracts, Canvas metadata | [api-standards.md](harness/api-standards.md) |
| Database | schema and migration rules; currently stubbed | [database.md](harness/database.md) |
| Dependencies | external services and module boundaries | [dependency-map.md](harness/dependency-map.md) |
| Deployment | build artifacts, manual install, release checks | [deployment.md](harness/deployment.md) |
| Glossary | project terms | [glossary.md](harness/glossary.md) |
| Failures | real incidents and learned rules | [failures.md](harness/failures.md) |
