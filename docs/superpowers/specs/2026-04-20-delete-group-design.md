# DELETE Group 删除机制 — 设计规格

**日期**：2026-04-20  
**状态**：已通过圆桌评审

---

## 背景与问题

现有删除机制：节点文本中手写 `DELETE` 关键词 → 导出时触发删除。

两个缺陷：
1. **批量操作成本高**：26 张卡片想删除，需逐一手写 DELETE，O(n) 操作
2. **卡片复活 bug**：删除成功后插件清除 DELETE 关键词和 ankiId，但节点颜色保留、`---` 保留，下次导出触发新建，卡片死而复生

---

## 设计决策

### 唯一删除机制：DELETE Group

废弃手写 DELETE 关键词（保留向后兼容），以 **DELETE Group** 作为唯一删除入口。

**用户心智模型**：DELETE group 是卡片的终点站。节点在里面 = 标记退休。

### 两种操作路径

| 场景 | 操作 |
|------|------|
| 删除部分卡片 | 框选目标节点 → 拖入 DELETE group |
| 删除整组卡片 | 将现有 group label 改为 DELETE → 导出 |

### DELETE Group Label 可配置

设置项新增：**删除组名称**（默认 `DELETE`，用户可自定义）。

---

## 状态矩阵

```
节点状态                          │ 行为
─────────────────────────────────┼──────────────────────────
在 DELETE group + 有 ankiId      │ 删除，清除 ankiId
在 DELETE group + 无 ankiId      │ 警告跳过，状态不变
颜色匹配 + 不在 DELETE group     │ 新建 / 更新（原有逻辑）
颜色不匹配 + 不在 DELETE group   │ 忽略（原有逻辑）
```

**关键设计原则**：
- 删除分支只检查 `ankiId`，**颜色不参与**
- 新建/更新分支只检查颜色，**DELETE group 成员直接跳过**
- 两个分支正交，互不干扰

---

## 为何颜色不参与删除判断

原有颜色检查的目的：防止"修改导出色设置 → 误删历史卡片"。

DELETE group 下此风险已消除：触发删除的是 group 成员资格，颜色设置变化不影响判断。

`ankiId` 是"节点存在于 Anki"的唯一凭证，颜色是"节点是否应被导出"的标记——两件事，分开管理。

---

## 幂等性

删除成功后节点留在 DELETE group，ankiId 被清除：

```
下次导出：在 DELETE group + 无 ankiId → 警告跳过
```

节点不会复活。DELETE group 成员资格本身是持久状态保护。

---

## 向后兼容

手写 DELETE 关键词机制保留，不强制迁移。但新用户文档以 DELETE group 为主路径。

长期可考虑：检测到手写 DELETE 时，提示用户迁移到 DELETE group 方式。

---

## 需要变更的组件

| 组件 | 变更内容 |
|------|----------|
| `settings.ts` | 新增 `deleteGroupLabel` 配置项，默认 `"DELETE"` |
| `parser.ts` | 解析 group 时识别 DELETE group；节点归属逻辑：DELETE group 优先于 Deck group |
| `exporter.ts` | 删除分支：检查节点是否在 DELETE group（不检查颜色）；有 ankiId → 删除；无 ankiId → 警告跳过 |
| `models.ts` | Card/Deletion 模型增加 `inDeleteGroup` 字段 |
