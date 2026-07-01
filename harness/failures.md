# Failures

> status: active
> owner: failures
> layer: universal
> 本文件负责真实事故和经验教训；不负责猜测性规则。

## When To Record

Record a failure when the project hits a non-obvious bug, workflow miss, repeated misunderstanding, or rule conflict.

Good candidates in this project:

- accidental Anki note deletion or duplicate creation;
- Canvas metadata writeback corrupting unknown fields;
- converter regressions around math, code fences, wiki links, or images;
- Obsidian runtime behavior diverging from unit-test assumptions;
- frozen CLI behavior changed unintentionally.

## Template

### YYYY-MM-DD: short symptom

- Symptom:
- Root cause:
- Fix:
- Prevention:
- Rule destination:

## Rules

- Record facts before abstracting new rules.
- Do not turn one-off incidents into broad policy without evidence.
- When a repeated failure becomes a rule, update the owner harness file.
