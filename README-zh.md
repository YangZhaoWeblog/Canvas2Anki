# Canvas2Anki

> 给你的 Canvas 节点开绿灯——一键导出到 Anki。

将 [Obsidian Canvas](https://obsidian.md) 中标色的节点导出为 Anki 闪卡，通过 [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 自动同步。

## 工作原理

```
Canvas 节点（颜色 4）           Anki 卡片
┌──────────────────┐           ┌──────────────┐
│ ECDSA 是什么？    │   ──►     │ 正面: ...    │
│ ---              │           │ 背面: ...    │
│ 基于椭圆曲线的    │           │ 牌组: 密码学  │
│ 数字签名方案      │           │ 标签: crypto │
└──────────────────┘           └──────────────┘
```

- **颜色 = 导出标记。** 在设置中选一个 Canvas 预设色（1-6），只有该颜色的节点会被导出。
- **`---` = 正反面分隔符。** 第一个独占一行的裸 `---`（代码围栏内的不算）分割正面和背面。
- **Canvas Group = Anki 牌组。** Group 的 label 就是牌组名。
- **`#标签`** 会从文本中提取为 Anki 标签。
- **箭头 = 追加内容。** 从卡片节点指向其他节点的箭头，将目标内容追加到背面（图片以 `![[]]` 形式，文本直接追加）。
- **`DELETE` = 显式删除。** 在卡片节点中写 `DELETE`，下次导出时删除对应的 Anki 卡片。不会因为切换导出颜色而误删——你的复习进度很安全。

## 安装

### 前置条件

1. [Anki](https://apps.ankiweb.net/) 并安装 [AnkiConnect](https://ankiweb.net/shared/info/2055492159)
2. AnkiConnect CORS 配置中添加 Obsidian：
   ```json
   {
     "webCorsOriginList": ["app://obsidian.md"]
   }
   ```
3. Anki 中有名为 **问答题** 的笔记类型，包含 **正面** 和 **背面** 两个字段（v0.1 硬编码）

### 安装插件

尚未上架社区插件。手动安装：

```bash
git clone https://github.com/yangzhao/canvas2anki.git
cd canvas2anki/plugin
npm install && npm run build
```

将 `plugin/main.js` 和 `plugin/manifest.json` 复制或软链接到 vault 的 `.obsidian/plugins/canvas2anki/` 目录。

## 使用

1. 在 Obsidian 中打开一个 Canvas 文件
2. 用导出颜色标记节点（默认：颜色 4，在默认主题中是绿色）
3. 用 `---` 分隔正面和背面
4. 点击左侧栏的上传图标，或在命令面板中运行 `Canvas2Anki: Export current canvas`
5. 完成。Toast 通知：`✓ 3 新建, 1 更新, 0 删除, 0 跳过`

### 删除卡片

在卡片节点文本中写 `DELETE`，然后导出。Anki 中的对应笔记会被删除，节点中的元数据和 DELETE 关键词会被自动清理。删除关键词可在设置中自定义。

## 设置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 导出颜色 | 4（绿色） | Canvas 预设色 1-6，哪个颜色代表要导出的卡片。设置页显示跟随当前主题的真实色块。 |
| 删除关键词 | `DELETE` | 节点文本中包含此关键词时触发 Anki 卡片删除 |

就这两项。笔记类型和字段名硬编码为 `问答题` / `正面` / `背面`。

## 元数据

导出后，每个节点末尾会写入不可见的 HTML 注释：

```
<!--card:{"id":1776596734851}-->
```

这是 Canvas 节点与 Anki 笔记的绑定。不要手动删除——插件会自动管理。

## 项目结构

```
canvas2anki/
├── plugin/          Obsidian 插件（TypeScript）
│   ├── src/
│   │   ├── main.ts          插件入口，注册 ribbon/command
│   │   ├── settings.ts      设置页，颜色色块选择
│   │   ├── parser.ts        Canvas JSON → Card[]
│   │   ├── converter.ts     Markdown → Anki HTML
│   │   ├── anki-client.ts   AnkiConnect HTTP 客户端
│   │   ├── exporter.ts      编排：解析 → 转换 → 上传
│   │   └── models.ts        接口与常量
│   └── tests/               32 个测试（vitest）
└── cli/             Python CLI（原型，已冻结）
```

## 开发

```bash
cd plugin
npm install
npm run dev          # 监听模式
npm run build        # 生产构建
npm test             # 运行测试
```

## License

MIT
