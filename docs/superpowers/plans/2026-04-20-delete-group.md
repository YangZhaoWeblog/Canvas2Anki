# DELETE Group 删除机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 DELETE Group 机制完全替代手写 DELETE 关键词机制，修复卡片复活 bug，支持批量删除。

**Architecture:** parser 新增 DELETE group 识别逻辑，将组内节点路由到 deletions；exporter 删除分支只检查 ankiId，不检查颜色；settings/models 移除 deleteKeyword，新增 deleteGroupLabel。

**Tech Stack:** TypeScript, Vitest, Obsidian Plugin API

---

## File Map

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `plugin/src/models.ts` | Modify | `PluginSettings` 移除 `deleteKeyword`，新增 `deleteGroupLabel: string` |
| `plugin/src/settings.ts` | Modify | 移除删除关键词输入框，新增删除组名称输入框 |
| `plugin/src/parser.ts` | Modify | `parseCanvas` 签名改为接收 `deleteGroupLabel`；识别 DELETE group；DELETE group 成员路由到 deletions（不检查颜色）；非 DELETE group 节点走原有颜色逻辑 |
| `plugin/src/exporter.ts` | Modify | 调用 `parseCanvas` 时传 `deleteGroupLabel`；删除分支不变（已经只检查 ankiId） |
| `plugin/src/main.ts` | Modify | `DEFAULT_SETTINGS` 和 `writebackToCanvas` 移除 deleteKeyword 相关逻辑 |
| `plugin/tests/parser.test.ts` | Modify | 移除 DELETE 关键词相关测试；新增 DELETE group 相关测试 |
| `plugin/tests/exporter.test.ts` | Modify | 更新 `SETTINGS` 移除 deleteKeyword；移除关键词删除测试；新增 DELETE group 删除测试 |

---

## Task 1: 更新 models.ts — 替换 PluginSettings 类型

**Files:**
- Modify: `plugin/src/models.ts`
- Test: `plugin/tests/models.test.ts`（检查类型编译通过即可，无运行时测试）

- [ ] **Step 1: 修改 `plugin/src/models.ts`，替换 `PluginSettings`**

将文件末尾的 `PluginSettings` 接口从：
```typescript
export interface PluginSettings {
  exportColor: string;   // "1"-"6", Canvas preset color index
  deleteKeyword: string; // text containing this keyword triggers Anki deletion
}
```
改为：
```typescript
export interface PluginSettings {
  exportColor: string;      // "1"-"6", Canvas preset color index
  deleteGroupLabel: string; // group with this label triggers Anki deletion
}
```

- [ ] **Step 2: 确认 TypeScript 报错（预期）**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

预期：出现 `deleteKeyword` 相关报错（settings.ts、parser.ts、exporter.ts、main.ts），说明变更已传播，后续任务逐步修复。

- [ ] **Step 3: Commit**

```bash
cd /Users/yangzhao/Code/canvas2anki && git add plugin/src/models.ts && git commit -m "refactor(models): replace deleteKeyword with deleteGroupLabel in PluginSettings"
```

---

## Task 2: 更新 settings.ts — 替换删除关键词设置项

**Files:**
- Modify: `plugin/src/settings.ts`

- [ ] **Step 1: 修改 `plugin/src/settings.ts`**

将"删除关键词"Setting 块：
```typescript
    // ── Delete keyword ──
    new Setting(containerEl)
      .setName("删除关键词")
      .setDesc("节点文本中包含此关键词时，导出将删除对应 Anki 卡片")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.deleteKeyword)
          .onChange(async (v) => {
            this.plugin.settings.deleteKeyword = v.trim();
            await this.plugin.saveSettings();
          })
      );
```
替换为：
```typescript
    // ── Delete group label ──
    new Setting(containerEl)
      .setName("删除组名称")
      .setDesc("label 为此名称的 Canvas Group 内的节点，导出时将删除对应 Anki 卡片")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.deleteGroupLabel)
          .onChange(async (v) => {
            this.plugin.settings.deleteGroupLabel = v.trim() || "DELETE";
            await this.plugin.saveSettings();
          })
      );
```

- [ ] **Step 2: 确认 tsc 报错减少**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

预期：settings.ts 的 `deleteKeyword` 报错消失，其余（parser、exporter、main）仍报错。

- [ ] **Step 3: Commit**

```bash
cd /Users/yangzhao/Code/canvas2anki && git add plugin/src/settings.ts && git commit -m "refactor(settings): replace delete keyword setting with delete group label"
```

---

## Task 3: 更新 parser.ts — 核心逻辑替换（TDD）

**Files:**
- Modify: `plugin/src/parser.ts`
- Modify: `plugin/tests/parser.test.ts`

### 3A: 先写失败测试

- [ ] **Step 1: 打开 `plugin/tests/parser.test.ts`，替换文件顶部常量和所有删除相关测试**

将：
```typescript
const COLOR = "4";
const DELETE_KW = "DELETE";
```
改为：
```typescript
const COLOR = "4";
const DELETE_LABEL = "DELETE";
```

将所有调用 `parseCanvas(json, COLOR, DELETE_KW)` 改为 `parseCanvas(json, COLOR, DELETE_LABEL)`。

- [ ] **Step 2: 移除旧的删除关键词测试，新增 DELETE group 测试**

删除这两个测试：
```typescript
it("deletes matching-color node with ankiId and DELETE keyword", ...)
it("does NOT delete non-matching color even with ankiId", ...)
it("does NOT delete matching-color node with ankiId but no DELETE keyword", ...)
```

在 `describe("parseCanvas", ...)` 末尾新增：
```typescript
  // ── DELETE group tests ──────────────────────────────────────────────────

  it("routes node with ankiId in DELETE group to deletions (color-independent)", () => {
    const json = makeCanvas([
      groupNode("dg", "DELETE", -200, -200, 1000, 1000),
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":99999}-->', COLOR, 0, 0),
    ]);
    const { deletions, cards } = parseCanvas(json, COLOR, DELETE_LABEL);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].ankiId).toBe(99999);
    expect(cards).toHaveLength(0);
  });

  it("skips (warns) node in DELETE group with no ankiId", () => {
    const json = makeCanvas([
      groupNode("dg", "DELETE", -200, -200, 1000, 1000),
      textNode("n1", "Q?\n---\nA", COLOR, 0, 0),
    ]);
    const { deletions, cards, warnings } = parseCanvas(json, COLOR, DELETE_LABEL);
    expect(deletions).toHaveLength(0);
    expect(cards).toHaveLength(0);
    expect(warnings[0]).toMatch(/DELETE group.*no ankiId/);
  });

  it("routes non-matching color node in DELETE group to deletions if has ankiId", () => {
    const json = makeCanvas([
      groupNode("dg", "DELETE", -200, -200, 1000, 1000),
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":55555}-->', "1", 0, 0), // color "1" ≠ export color "4"
    ]);
    const { deletions, cards } = parseCanvas(json, COLOR, DELETE_LABEL);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].ankiId).toBe(55555);
    expect(cards).toHaveLength(0);
  });

  it("does NOT route to deletions when node is NOT in DELETE group", () => {
    const json = makeCanvas([
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":77777}-->', COLOR, 0, 0),
    ]);
    const { deletions, cards } = parseCanvas(json, COLOR, DELETE_LABEL);
    expect(deletions).toHaveLength(0);
    expect(cards).toHaveLength(1);
  });

  it("respects custom delete group label", () => {
    const json = makeCanvas([
      groupNode("dg", "垃圾桶", -200, -200, 1000, 1000),
      textNode("n1", 'Q?\n---\nA\n<!--card:{"id":11111}-->', COLOR, 0, 0),
    ]);
    const { deletions } = parseCanvas(json, COLOR, "垃圾桶");
    expect(deletions).toHaveLength(1);
    expect(deletions[0].ankiId).toBe(11111);
  });

  it("normal export-color node outside DELETE group still exports", () => {
    const json = makeCanvas([
      groupNode("dg", "DELETE", 500, 500, 100, 100), // far away, node not inside
      textNode("n1", "Q?\n---\nA", COLOR, 0, 0),
    ]);
    const { cards, deletions } = parseCanvas(json, COLOR, DELETE_LABEL);
    expect(cards).toHaveLength(1);
    expect(deletions).toHaveLength(0);
  });
```

- [ ] **Step 3: 运行测试，确认新增测试全部失败**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx vitest run tests/parser.test.ts 2>&1 | tail -30
```

预期：新增的 6 个 DELETE group 测试 FAIL，旧测试 PASS。

### 3B: 实现 parser.ts

- [ ] **Step 4: 修改 `plugin/src/parser.ts` — 更新函数签名和核心逻辑**

将 `parseCanvas` 函数签名从：
```typescript
export function parseCanvas(json: string, exportColor: string, deleteKeyword: string): ParseResult {
```
改为：
```typescript
export function parseCanvas(json: string, exportColor: string, deleteGroupLabel: string): ParseResult {
```

在函数内部，`nodeById` 和 `groups` 构建之后，新增 DELETE group 查找：

将：
```typescript
  const nodeById = new Map<string, RawNode>(nodes.map((n) => [n.id, n]));
  const groups = nodes.filter((n) => n.type === "group");
```
改为：
```typescript
  const nodeById = new Map<string, RawNode>(nodes.map((n) => [n.id, n]));
  const groups = nodes.filter((n) => n.type === "group");

  // Identify DELETE group (by label match)
  const deleteGroups = groups.filter(
    (g) => g.label?.trim() === deleteGroupLabel.trim()
  );

  /** Returns true if node center is inside any DELETE group */
  function isInDeleteGroup(node: RawNode): boolean {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    return deleteGroups.some(
      (g) => cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height
    );
  }
```

将主循环体从：
```typescript
  for (const node of nodes) {
    if (node.type !== "text" || !node.text) continue;

    const rawText = node.text;
    const ankiId = extractMeta(rawText);
    const isMatch = node.color === exportColor;

    // Non-matching color: always skip, never delete
    if (!isMatch) continue;

    // Deletion: matching color + has ankiId + text contains delete keyword
    if (ankiId !== null && deleteKeyword && stripMeta(rawText).includes(deleteKeyword)) {
      deletions.push({
        nodeId: node.id,
        front: "",
        back: "",
        deck: DEFAULT_DECK,
        tags: [],
        ankiId,
      });
      continue;
    }
```
改为：
```typescript
  for (const node of nodes) {
    if (node.type !== "text" || !node.text) continue;

    const rawText = node.text;
    const ankiId = extractMeta(rawText);

    // DELETE group branch: color-independent, only checks ankiId
    if (isInDeleteGroup(node)) {
      if (ankiId !== null) {
        deletions.push({
          nodeId: node.id,
          front: "",
          back: "",
          deck: DEFAULT_DECK,
          tags: [],
          ankiId,
        });
      } else {
        warnings.push(`Node ${node.id}: in DELETE group but has no ankiId — skipped`);
      }
      continue;
    }

    // Normal export branch: color must match
    const isMatch = node.color === exportColor;
    if (!isMatch) continue;
```

- [ ] **Step 5: 运行所有测试，确认全部通过**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx vitest run 2>&1 | tail -20
```

预期：全部 PASS（新增 6 个 + 原有旧测试中不含 deleteKeyword 的全部）。

- [ ] **Step 6: Commit**

```bash
cd /Users/yangzhao/Code/canvas2anki && git add plugin/src/parser.ts plugin/tests/parser.test.ts && git commit -m "feat(parser): replace deleteKeyword with DELETE group mechanism

- parseCanvas now accepts deleteGroupLabel instead of deleteKeyword
- nodes in DELETE group route to deletions regardless of color
- nodes in DELETE group without ankiId produce a warning and are skipped
- removes keyword-based deletion logic entirely"
```

---

## Task 4: 更新 exporter.ts 和 exporter.test.ts

**Files:**
- Modify: `plugin/src/exporter.ts`
- Modify: `plugin/tests/exporter.test.ts`

### 4A: 先更新测试

- [ ] **Step 1: 修改 `plugin/tests/exporter.test.ts` 顶部 SETTINGS 常量**

将：
```typescript
const SETTINGS: PluginSettings = {
  exportColor: "4",
  deleteKeyword: "DELETE",
};
```
改为：
```typescript
const SETTINGS: PluginSettings = {
  exportColor: "4",
  deleteGroupLabel: "DELETE",
};
```

- [ ] **Step 2: 移除旧的关键词删除测试，新增 DELETE group 删除测试**

删除这两个测试：
```typescript
it("deletes card with matching color + ankiId + DELETE keyword", ...)
it("does NOT delete non-matching color node even with ankiId", ...)
it("handles deleteNotes failure gracefully, continues to next", ...)
```

在 `describe("exportCanvas", ...)` 末尾新增：
```typescript
  it("deletes card in DELETE group with ankiId", async () => {
    const json = JSON.stringify({
      nodes: [
        { id: "dg", type: "group", label: "DELETE", x: -200, y: -200, width: 1000, height: 1000 },
        { id: "n1", type: "text", color: "4",
          text: 'Q?\n---\nA\n<!--card:{"id":77777}-->',
          x: 0, y: 0, width: 100, height: 50 },
      ],
      edges: [],
    });
    const client = makeMockClient();
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.deleted).toBe(1);
    expect(client.deleteNotes).toHaveBeenCalledWith([77777]);
    expect(result.deletedNodeIds).toContain("n1");
  });

  it("skips node in DELETE group with no ankiId, counts as warning", async () => {
    const json = JSON.stringify({
      nodes: [
        { id: "dg", type: "group", label: "DELETE", x: -200, y: -200, width: 1000, height: 1000 },
        { id: "n1", type: "text", color: "4",
          text: "Q?\n---\nA",
          x: 0, y: 0, width: 100, height: 50 },
      ],
      edges: [],
    });
    const client = makeMockClient();
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.deleted).toBe(0);
    expect(result.stats.skipped).toBe(1);
    expect(client.deleteNotes).not.toHaveBeenCalled();
  });

  it("handles deleteNotes failure gracefully, continues to next", async () => {
    const json = JSON.stringify({
      nodes: [
        { id: "dg", type: "group", label: "DELETE", x: -200, y: -200, width: 1000, height: 1000 },
        { id: "n1", type: "text", color: "4",
          text: 'Q1?\n---\nA1\n<!--card:{"id":11111}-->',
          x: 0, y: 0, width: 100, height: 50 },
        { id: "n2", type: "text", color: "4",
          text: 'Q2?\n---\nA2\n<!--card:{"id":22222}-->',
          x: 0, y: 100, width: 100, height: 50 },
      ],
      edges: [],
    });
    const client = makeMockClient();
    client.deleteNotes
      .mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce(undefined);
    const result = await exportCanvas(makeParams(json, client));

    expect(result.stats.deleted).toBe(1);
    expect(result.stats.skipped).toBe(1);
    expect(client.deleteNotes).toHaveBeenCalledTimes(2);
    expect(result.deletedNodeIds).toHaveLength(1);
  });
```

- [ ] **Step 3: 运行测试，确认新增测试失败**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx vitest run tests/exporter.test.ts 2>&1 | tail -20
```

预期：新增的 3 个 DELETE group 测试 FAIL（parseCanvas 调用还没更新）。

### 4B: 实现 exporter.ts

- [ ] **Step 4: 修改 `plugin/src/exporter.ts` 中 `parseCanvas` 调用**

将：
```typescript
  const { cards, warnings, deletions } = parseCanvas(canvasJson, settings.exportColor, settings.deleteKeyword);
```
改为：
```typescript
  const { cards, warnings, deletions } = parseCanvas(canvasJson, settings.exportColor, settings.deleteGroupLabel);
```

- [ ] **Step 5: 运行所有测试，确认全部通过**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx vitest run 2>&1 | tail -20
```

预期：全部 PASS。

- [ ] **Step 6: Commit**

```bash
cd /Users/yangzhao/Code/canvas2anki && git add plugin/src/exporter.ts plugin/tests/exporter.test.ts && git commit -m "feat(exporter): wire up deleteGroupLabel, update tests for DELETE group"
```

---

## Task 5: 更新 main.ts — 移除 deleteKeyword 残留

**Files:**
- Modify: `plugin/src/main.ts`

- [ ] **Step 1: 修改 `DEFAULT_SETTINGS`**

将：
```typescript
const DEFAULT_SETTINGS: PluginSettings = {
  exportColor: "4",
  deleteKeyword: "DELETE",
};
```
改为：
```typescript
const DEFAULT_SETTINGS: PluginSettings = {
  exportColor: "4",
  deleteGroupLabel: "DELETE",
};
```

- [ ] **Step 2: 修改 `writebackToCanvas` 方法，移除 deleteKeyword 文本清理逻辑**

将：
```typescript
      if (deletedNodeIds.includes(node.id)) {
        let text = stripMeta(node.text ?? "");
        const kw = this.settings.deleteKeyword;
        if (kw) text = text.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
        node.text = text.replace(/\n{3,}/g, "\n\n").trim();
      }
```
改为：
```typescript
      if (deletedNodeIds.includes(node.id)) {
        node.text = stripMeta(node.text ?? "").trim();
      }
```

（删除后节点留在 DELETE group，ankiId 已被清除，group 成员资格防止复活，不需要额外文本清理。）

- [ ] **Step 3: 确认 TypeScript 编译无报错**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx tsc --noEmit --skipLibCheck 2>&1
```

预期：无输出（零报错）。

- [ ] **Step 4: 运行全量测试**

```bash
cd /Users/yangzhao/Code/canvas2anki/plugin && npx vitest run 2>&1 | tail -20
```

预期：全部 PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/yangzhao/Code/canvas2anki && git add plugin/src/main.ts && git commit -m "refactor(main): remove deleteKeyword, use deleteGroupLabel in defaults and writeback"
```

---

## 验收标准

```
全量测试通过：npx vitest run → 全部 PASS
TypeScript 零报错：npx tsc --noEmit --skipLibCheck → 无输出
```

状态矩阵验证（对应测试覆盖）：

| 场景 | 对应测试 |
|------|---------|
| DELETE group + 有 ankiId → 删除 | parser Task3 test1, exporter Task4 test1 |
| DELETE group + 无 ankiId → 警告跳过 | parser Task3 test2, exporter Task4 test2 |
| DELETE group + 颜色不匹配 + 有 ankiId → 删除 | parser Task3 test3 |
| 普通节点（不在 DELETE group）→ 正常导出 | parser Task3 test4 |
| 自定义 deleteGroupLabel | parser Task3 test5 |
| 节点不在 DELETE group 几何范围内 → 正常导出 | parser Task3 test6 |
| deleteNotes 失败 → 继续下一个 | exporter Task4 test3 |
