# Canvas2Anki：元数据迁移至顶层字段

> 状态：Draft  
> 日期：2026-04-22  
> 关联插件：canvas2anki、canvas-annotator（canvasMargin）

## 背景

当前 Anki 卡片 ID 以 HTML 注释 `<!--card:{"id":123456}-->` 的形式嵌入在 `node.text` 末尾。这种方式：

- 用户编辑节点时可能误删元数据
- 需要 regex 扫描 text 内容，解析不直观
- 与 canvas-annotator 共用同一个 `<!--card:...-->` key，两个插件的元数据耦合

## 目标

将 `<!--card:{"id":...}-->` 迁移为 canvas JSON 中的**节点顶层字段**，与 Advanced Canvas 的 `styleAttributes`、`zIndex` 等自定义字段采用相同模式。

## 新数据格式

### Before

```json
{
  "id": "nodeId",
  "type": "text",
  "text": "正面\n---\n背面\n<!--card:{\"id\":1776596734851}-->",
  "x": 0, "y": 0, "width": 300, "height": 100, "color": "4"
}
```

### After

```json
{
  "id": "nodeId",
  "type": "text",
  "text": "正面\n---\n背面",
  "x": 0, "y": 0, "width": 300, "height": 100, "color": "4",
  "canvas2anki": {
    "id": 1776596734851
  }
}
```

**命名约定：**
- 顶层 key 为插件 id（小驼峰）：`canvas2anki`
- 值为对象，当前只有 `id`（number，Anki note ID），未来可扩展

## 改动范围

### models.ts

| 改动 | 说明 |
|------|------|
| 删除 | `CARD_META_RE`、`CARD_META_GLOBAL_RE` 常量 |
| 删除 | `parseMeta()`、`stripMeta()`、`writeMeta()` 函数 |
| 新增 | `Canvas2AnkiMeta` 接口 `{ id: number }` |
| 新增 | `readAnkiMeta(node): Canvas2AnkiMeta \| null` — 读取 `node.canvas2anki` |
| 新增 | `writeAnkiMeta(node, meta): node` — 返回带 `canvas2anki` 字段的新 node 对象 |
| 新增 | `stripAnkiMeta(node): node` — 返回删除了 `canvas2anki` 字段的新 node 对象 |

接口设计（纯函数，操作 plain object，不依赖 Obsidian API）：

```typescript
export interface Canvas2AnkiMeta {
  id: number;
}

export interface RawNode {
  canvas2anki?: Canvas2AnkiMeta;
  [key: string]: unknown;
}

/** 读取节点的 canvas2anki 元数据 */
export function readAnkiMeta(node: RawNode): Canvas2AnkiMeta | null {
  const meta = node.canvas2anki;
  if (!meta || typeof meta.id !== "number") return null;
  return meta;
}

/** 返回附加了 canvas2anki 字段的新节点对象 */
export function writeAnkiMeta(node: RawNode, meta: Canvas2AnkiMeta): RawNode {
  return { ...node, canvas2anki: meta };
}

/** 返回移除了 canvas2anki 字段的新节点对象 */
export function stripAnkiMeta(node: RawNode): RawNode {
  const { canvas2anki: _, ...rest } = node;
  return rest;
}
```

### parser.ts

| 改动 | 说明 |
|------|------|
| 修改 | `extractMeta(text)` → 删除。改为在 `parseCanvas` 中直接用 `readAnkiMeta(node)` |
| 修改 | `stripMeta(text)` → 删除。`text` 字段不再含元数据，无需清理 |
| 修改 | `parseCanvas()` — 从 `node.canvas2anki?.id` 读 ankiId，`node.text` 直接使用不再清理 |
| 修改 | `appendTarget()` — 移除 `stripMeta(node.text)` 调用，直接返回 `node.text` |

### exporter.ts

无改动。exporter 只接收 `Card[]`，不涉及节点数据格式。

### main.ts

| 改动 | 说明 |
|------|------|
| 修改 | `writebackToCanvas()` — 用 `writeAnkiMeta()` 写 `node.canvas2anki`，不再修改 `node.text` |
| 修改 | 删除节点时用 `stripAnkiMeta()` 移除 `node.canvas2anki`，不再 `stripMeta(node.text)` |

具体改动：

```typescript
// Before:
node.text = writeMeta(node.text ?? "", { id: idWriteback[node.id] });
// After:
node.canvas2anki = { id: idWriteback[node.id] };

// Before:
node.text = stripMeta(node.text ?? "").trim();
// After:
delete node.canvas2anki;
```

### converter.ts

无改动。

### settings.ts

无改动。

## 测试改动

### models.test.ts

| 改动 | 说明 |
|------|------|
| 删除 | `CARD_META_RE` 匹配测试 |
| 删除 | `parseMeta()`、`stripMeta()`、`writeMeta()` 测试 |
| 新增 | `readAnkiMeta()` 测试：有 meta、无 meta、类型错误 |
| 新增 | `writeAnkiMeta()` 测试：新增 meta、覆盖已有 meta |
| 新增 | `stripAnkiMeta()` 测试：有 meta、无 meta |

### parser.test.ts

| 改动 | 说明 |
|------|------|
| 修改 | 所有测试用例的 fixture：`text` 字段不再含 `<!--card:...-->`，ankiId 放入 `canvas2anki` 字段 |
| 删除 | `extractMeta()`、`stripMeta()` 的独立测试 |
| 修改 | `parseCanvas` 测试的输入 JSON 格式 |

### exporter.test.ts

无改动（exporter 不涉及节点格式）。

## 不做

- **历史数据迁移脚本**：两个插件的迁移脚本统一在最后写，不在本 spec 范围内
- **兼容旧格式读取**：不做向后兼容。迁移脚本一次性处理，代码只认新格式
- **canvas-annotator 联动**：canvas-annotator 有独立的 spec，各自改各自的

## 验收标准

1. `npm run test` 全量通过
2. `npm run build` 零报错
3. 导出后 `.canvas` 文件中 `node.text` 不含 `<!--card:...-->`
4. `canvas2anki` 字段正确写入节点顶层
5. DELETE 操作正确清除 `canvas2anki` 字段
