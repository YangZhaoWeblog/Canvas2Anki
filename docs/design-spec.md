# Canvas2Anki Obsidian Plugin — Design Spec

## 背景

用 Obsidian Canvas 替代 MarginNote 做空间组织。Canvas 中标记颜色的节点 = 卡片，需导出到 Anki。Python CLI 已验证核心逻辑（原型，不再维护），现在用 Obsidian 插件。

## 范围

**做：** Canvas → Anki 导出插件。
**不做：** md 批注 ↔ Canvas 双向跳转（延后决定）。
**元数据格式** `<!--card:{JSON}-->` 已为 V2 留好扩展空间（`anc`、`tpl` 字段）。

## 仓库结构

```
canvas2anki/
├── cli/          ← Python CLI（原型，不再维护）
├── plugin/       ← Obsidian 插件（TypeScript）
└── docs/         ← 设计文档
```

---

## 产品决策

### 触发方式

用户手动点击导出。两个入口：
- **Ribbon 图标**：左侧栏导出按钮
- **Command Palette**：`Canvas2Anki: Export current canvas`

作用于当前打开的 Canvas 文件。不做自动导出（导出有外部副作用，用户应有控制权）。

### 反馈

- 成功 → Obsidian Notice (toast)：`✓ 3 新建, 1 更新, 0 删除, 0 跳过`
- 有警告 → console 输出详情
- 失败（AnkiConnect 未连接等）→ toast 报错

### 设置项

| 项目 | 输入方式 | 默认值 | 说明 |
|------|----------|--------|------|
| 导出颜色 | 6 个色块点选 | 颜色 4（绿） | Canvas 预设色编号 `"1"`-`"6"`，色块读取主题 CSS 变量实时渲染 |
| 删除关键词 | 文本框 | `DELETE` | 节点文本含此关键词时触发 Anki 卡片删除 |

### 硬编码项（不做设置）

| 项目 | 值 | 理由 |
|------|-----|------|
| Anki 模板名 | `问答题` | 产品定义，不是用户偏好 |
| 正面字段 | `正面` | 同上 |
| 背面字段 | `背面` | 同上 |
| Q/A 分隔符 | `---` | 同上 |
| AnkiConnect 地址 | `127.0.0.1:8765` | 行业事实标准 |
| 回链 | 永远带 | 没有不想跳回来的理由 |
| 默认 Deck | `Default` | 未入组卡片的 fallback |

### 颜色匹配

支持 Canvas 预设色 `"1"`-`"6"`。JSON 中 `node.color` 存的是编号字符串（如 `"4"`），与设置中选择的编号做字符串等值比较。

预设色的实际渲染颜色由主题 CSS 变量决定（`--color-red` 到 `--color-purple`），换主题视觉变但编号不变，导出不受影响。

设置页读取 CSS 变量渲染 6 个真实色块，用户点选即可，无需手填 RGB。

---

## 核心逻辑

### 卡片识别

Canvas JSON 中 `type === "text"` 且 `color` 匹配用户设置的预设色编号的节点。

### Q/A 分割

节点文本中第一个独占一行的裸 `---`（代码围栏内的 `---` 跳过）。
- `---` 之前 = 正面
- `---` 之后 = 背面
- 无 `---` → 警告跳过

### 出边追加

匹配色节点箭头指向的目标节点，按 y 坐标排序，追加到背面：

| 目标类型 | 处理 |
|----------|------|
| `type: "text"` | 文本追加 |
| `type: "file"`，图片扩展名 | `![[路径]]` 追加 |
| `type: "file"`，md 文件 | `[[文件名]]` 追加 |

### Deck 归属

Canvas Group 节点的 `label` = Anki deck 名。几何包含判定（节点中心点在 Group 内）。嵌套取最小 Group。未入组 → `Default`。

### 标签

节点文本中的 `#标签` → 从正面/背面移除 → 加入 Anki tags。

### 元数据

节点文本末尾：`<!--card:{"id":1776014384623}-->`
- `id`：Anki note ID，导出后回写
- Canvas 浏览模式下不可见

### 状态矩阵

| 颜色匹配 | 有 `---` | 有 ID | 含 DELETE 关键词 | 动作 |
|----------|---------|-------|-----------------|------|
| ✓ | ✓ | 无 | — | **新建** addNote → 回写 ID |
| ✓ | ✓ | 有 | ✗ | **更新** updateNoteFields |
| ✓ | — | 有 | ✓ | **删除** deleteNotes + 清除 metadata + 清除关键词 |
| ✓ | ✗ | — | ✗ | 警告跳过 |
| ✗ | — | — | — | **忽略**（永不自动删除） |

**关键设计：** 颜色不匹配的节点一律跳过，不论是否有 ankiId。只有匹配色节点中显式包含删除关键词才触发删除。切换导出颜色设置不会误删已有卡片。

---

## Markdown → HTML 转换

保护管线：

1. 保护 `$$...$$` 块级数学 → `\[...\]`
2. 保护 `$...$` 行内数学 → `\(...\)`
3. 保护 `` ``` `` 代码块 → `<pre><code>`
4. 保护 `` ` `` 行内代码 → `<code>`
5. `==text==` → `<mark>text</mark>`
6. `![[image.png]]` → `<img src="image.png">`
7. `[[note]]` → `<a href="obsidian://...">note</a>`
8. Markdown → HTML（marked 库）
9. 还原保护的内容

### 媒体上传

`![[image.png]]` → vault 内搜索文件 → `storeMediaFile` 上传到 Anki。
搜索策略：先精确路径，再按文件名全局搜索。

### 回链

背面 HTML 末尾追加：
```html
<br><a href="obsidian://open?vault={vault}&file={canvas_path}">📎 Canvas</a>
```

---

## AnkiConnect 接口

前置条件：用户已安装 AnkiConnect 插件，CORS 已配置 `app://obsidian.md`。

| 操作 | API | 说明 |
|------|-----|------|
| 检查连接 | `version` | 导出前先调，失败则 toast 报错 |
| 创建 Deck | `createDeck` | 幂等，导出前自动创建 |
| 新建卡片 | `addNote` | `allowDuplicate: false` |
| 更新卡片 | `updateNoteFields` | 只改内容，不影响学习进度 |
| 删除卡片 | `deleteNotes` | 显式 DELETE 关键词触发 |
| 上传媒体 | `storeMediaFile` | 同名覆盖 |

### 错误处理

- AnkiConnect 未连接 → toast 报错，终止
- 单张 addNote/updateNote/deleteNotes 失败 → 警告跳过该卡，继续处理其余
- 媒体文件不存在 → 跳过，不阻断

---

## 插件架构

```
plugin/
├── src/
│   ├── main.ts          ← 插件入口，注册 command/ribbon，writeback
│   ├── settings.ts      ← Settings Tab，色块选择器 + 删除关键词
│   ├── parser.ts        ← Canvas JSON → Card[]
│   ├── converter.ts     ← Markdown → Anki HTML
│   ├── anki-client.ts   ← AnkiConnect HTTP 客户端（Obsidian requestUrl）
│   ├── exporter.ts      ← 编排：parse → convert → upload
│   └── models.ts        ← Card 接口 + 常量（MODEL_NAME/FRONT_FIELD/BACK_FIELD）
├── tests/               ← vitest 测试
├── manifest.json
├── package.json
└── tsconfig.json
```

---

## V1 不做

- 自动导出 / 文件监听
- 多模板支持
- 多字段映射（`---` 二分法是产品边界）
- 自定义 RGB 色（只支持预设色 1-6）
- 批注回跳（V2）
- vault 全局扫描
- 从 Anki 拉取模板列表
