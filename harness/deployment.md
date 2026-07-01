# Deployment

> status: active
> owner: deployment
> layer: profile
> 本文件负责构建产物、手动安装、发布和回滚规则；不负责本地开发细节。

## Current Release Shape

- The plugin is not listed in the Obsidian community plugin directory.
- Manual install builds `plugin/main.js` and uses `plugin/manifest.json`.
- Users copy or symlink plugin artifacts into a vault's `.obsidian/plugins/canvas2anki/` directory.
- No CI/CD, container, package registry, or protected release branch was detected.

## Build Artifacts

- Production build command: `cd plugin && npm run build`.
- Do not manually edit generated `plugin/main.js` unless the task explicitly targets generated release artifacts.
- Keep `plugin/manifest.json` aligned with user-visible plugin identity and release requirements.

## Release Checks

Before claiming a releasable plugin change:

1. Run `cd plugin && npm test`.
2. Run `cd plugin && npm run build`.
3. Confirm manual install instructions still match generated artifacts.
4. Note any live Obsidian/Anki smoke test that was skipped.

## Rollback

- For manual installs, rollback is replacing the vault plugin files with the previous known-good `main.js` and `manifest.json`.
- Do not delete user Canvas metadata or Anki notes as part of rollback unless explicitly requested.

## Project Growth TODO

- [ ] Decide whether release artifacts are committed or generated only locally.
- [ ] Add CI/release instructions if the project adopts them.
