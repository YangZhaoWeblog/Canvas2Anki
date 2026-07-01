# Local Development

> status: active
> owner: local-development
> layer: universal
> 本文件负责本地安装、运行、调试命令；不负责工作流、提交或评审门禁。

## Environment

- Required tools: Node.js/npm for `plugin/`; Python with `pip` for `cli/`; Anki with AnkiConnect for end-to-end manual testing; Obsidian for plugin runtime checks.
- Plugin setup:

```bash
cd plugin
npm install
```

- CLI setup:

```bash
cd cli
pip install -r requirements.txt
```

## Run

```bash
cd plugin
npm run dev
```

## Common Commands

| Goal | Command |
|---|---|
| Plugin tests | `cd plugin && npm test` |
| Plugin production build | `cd plugin && npm run build` |
| Plugin watch build | `cd plugin && npm run dev` |
| Python CLI tests | `cd cli && pytest` |
| Format / lint | unknown |

## Local Debug

- Obsidian plugin runtime: build `plugin/main.js`, then copy or symlink `plugin/main.js` and `plugin/manifest.json` into the vault plugin directory.
- AnkiConnect dependency: Anki must be running with AnkiConnect installed and CORS allowing `app://obsidian.md`.
- Export side effects: manual tests may create, update, or delete Anki notes. Use a test deck and known note type when possible.

## Project Growth TODO

- [ ] Confirm supported Node.js and Python versions.
- [ ] Decide whether lint/format commands should be added.
- [ ] Document a repeatable manual Obsidian vault test setup.
