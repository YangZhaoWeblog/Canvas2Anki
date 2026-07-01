# Database

> status: stub
> owner: database
> layer: profile
> 本文件负责数据库、迁移和数据一致性规则；不负责 API 合约。

## Activation

Activate when the project owns a database schema, migration tool, persistence models, or transactional data consistency behavior.

Current state: no local database, migration directory, ORM, or schema owner was detected. Canvas JSON metadata and Anki note IDs are project data contracts, but their compatibility rules live in [api-standards.md](api-standards.md).

## Core Rules

- Use migrations for schema changes if a database is introduced.
- Do not edit already-applied migrations unless explicitly approved.
- Define transaction boundaries.
- Document indexes and compatibility constraints.

## Project Growth TODO

- [ ] Identify database engine if one is introduced.
- [ ] Identify migration tool if one is introduced.
- [ ] Define rollback expectations for persistent data.
