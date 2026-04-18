"""将 Obsidian Canvas JSON 解析为 Card 对象。"""

import json
import re
from pathlib import Path

from models import Card, GREEN_COLOR, DEFAULT_DECK, CARD_META_PATTERN


def parse_canvas(canvas_path: Path) -> tuple[list[Card], list[str], list[Card]]:
    """解析 .canvas 文件，返回 (cards, warnings, deletions)。

    cards：绿色 + 有 --- 的节点，待导出。
    warnings：绿色但无 --- 的节点（跳过）。
    deletions：非绿色但有 ID 的节点（待删除）。
    """
    with open(canvas_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    node_map = {n["id"]: n for n in nodes}

    # 出边映射：source_id → [target_ids]
    outgoing: dict[str, list[str]] = {}
    for edge in edges:
        src = edge["fromNode"]
        outgoing.setdefault(src, []).append(edge["toNode"])

    groups = [n for n in nodes if n.get("type") == "group"]

    cards: list[Card] = []
    warnings: list[str] = []
    deletions: list[Card] = []

    for node in nodes:
        if node.get("type") != "text":
            continue

        is_green = node.get("color") == GREEN_COLOR
        text = node.get("text", "")
        meta = _extract_meta(text)
        clean_text = _strip_meta(text)

        if is_green:
            front, back = _split_qa(clean_text)
            if front is None:
                preview = clean_text[:20]
                warnings.append(f'SKIP: 节点 "{preview}" — 绿色但无 --- 分隔')
                continue

            tags, front = _extract_tags(front)
            back_tags, back = _extract_tags(back)
            tags.extend(back_tags)

            # 出边内容追加到答案末尾（按 y 坐标排序）
            target_ids = outgoing.get(node["id"], [])
            if target_ids:
                targets = [node_map[tid] for tid in target_ids if tid in node_map]
                targets.sort(key=lambda n: n.get("y", 0))
                for target in targets:
                    back = _append_target(back, target)

            deck = _find_deck(node, groups)

            cards.append(Card(
                node_id=node["id"],
                front=front.strip(),
                back=back.strip(),
                deck=deck,
                tags=tags,
                anki_id=meta.get("id"),
            ))

        elif not is_green and meta.get("id"):
            # 非绿色 + 有 ID → 待删除
            preview = clean_text[:20]
            deletions.append(Card(
                node_id=node["id"],
                front=preview,
                back="",
                anki_id=meta["id"],
            ))

    return cards, warnings, deletions


def _split_qa(text: str) -> tuple[str | None, str | None]:
    """在第一个裸 --- 处分割文本，返回 (正面, 背面) 或 (None, None)。"""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if line.strip() == "---":
            # 前一行以 | 开头则是表格，跳过
            if i > 0 and lines[i - 1].strip().startswith("|"):
                continue
            # 后一行以 | 开头则是表格，跳过
            if i + 1 < len(lines) and lines[i + 1].strip().startswith("|"):
                continue
            return "\n".join(lines[:i]), "\n".join(lines[i + 1:])
    return None, None


def _extract_meta(text: str) -> dict:
    """从文本提取 <!--card:{...}--> 元数据。"""
    match = re.search(CARD_META_PATTERN, text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return {}
    return {}


def _strip_meta(text: str) -> str:
    """从文本中移除 <!--card:{...}-->。"""
    return re.sub(r"<!--card:.*?-->", "", text).strip()


def _extract_tags(text: str) -> tuple[list[str], str]:
    """提取 #标签，返回 (标签列表, 去标签后的文本)。"""
    tags = re.findall(r"#([\w\u4e00-\u9fff]+)", text)
    cleaned = re.sub(r"#[\w\u4e00-\u9fff]+", "", text)
    return tags, cleaned


def _append_target(back: str, target: dict) -> str:
    """将出边目标节点的内容追加到答案末尾。"""
    t = target.get("type")
    if t == "text":
        return back + "\n\n" + target.get("text", "")
    elif t == "file":
        filepath = target.get("file", "")
        ext = filepath.rsplit(".", 1)[-1].lower() if "." in filepath else ""
        if ext in ("png", "jpg", "jpeg", "gif", "svg", "webp"):
            return back + f"\n\n![[{filepath}]]"
        else:
            name = filepath.rsplit("/", 1)[-1].rsplit(".", 1)[0]
            return back + f"\n\n[[{name}]]"
    return back


def _find_deck(node: dict, groups: list[dict]) -> str:
    """找到包含该节点的 Group，返回其 label；未找到则返回 DEFAULT_DECK。"""
    nx, ny = node["x"], node["y"]
    nw, nh = node["width"], node["height"]
    for g in groups:
        gx, gy = g["x"], g["y"]
        gw, gh = g["width"], g["height"]
        if nx >= gx and ny >= gy and nx + nw <= gx + gw and ny + nh <= gy + gh:
            return g.get("label", DEFAULT_DECK)
    return DEFAULT_DECK
