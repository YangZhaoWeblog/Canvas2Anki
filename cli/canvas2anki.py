#!/usr/bin/env python3
"""canvas2anki — 将 Obsidian Canvas 卡片通过 AnkiConnect 导出到 Anki。

用法：
    python canvas2anki.py <file.canvas> [file2.canvas ...]
    python canvas2anki.py --dry-run <file.canvas>
"""

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

from anki_client import AnkiClient
from converter import md_to_anki_html
from models import CARD_META_PATTERN, DEFAULT_MODEL
from parser import parse_canvas


def process_canvas(
    canvas_path: Path,
    client: AnkiClient,
    vault_root: Path | None = None,
    vault_name: str = "MyDigitalGarden",
    dry_run: bool = False,
) -> dict:
    """处理单个 .canvas 文件，返回统计字典。"""
    cards, warnings, deletions = parse_canvas(canvas_path)
    stats = {"added": 0, "updated": 0, "deleted": 0, "skipped": len(warnings)}

    for w in warnings:
        print(f"  ├─ {w}")

    # 创建所需 deck
    if not dry_run:
        for deck in {c.deck for c in cards}:
            client.create_deck(deck)

    id_writeback: dict[str, int] = {}

    for card in cards:
        # 上传媒体
        if vault_root and not dry_run:
            _upload_media(card.back, vault_root, client)

        # 转换 markdown → HTML
        front_html = md_to_anki_html(card.front, vault=vault_name)
        back_html = md_to_anki_html(card.back, vault=vault_name)

        # 追加回链
        canvas_rel = str(canvas_path.relative_to(vault_root)) if vault_root else str(canvas_path)
        back_html += _make_backlink(vault_name, canvas_rel)

        fields = {"正面": front_html, "背面": back_html}

        if card.anki_id:
            if not dry_run:
                try:
                    client.update_note_fields(card.anki_id, fields)
                    id_writeback[card.node_id] = card.anki_id
                except Exception as e:
                    print(f'  ├─ WARN: "{card.front[:30]}" 更新失败 — {e}')
                    stats["skipped"] += 1
                    continue
            stats["updated"] += 1
            print(f'  ├─ 更新: "{card.front[:30]}" [ID: {card.anki_id}]')
        else:
            if not dry_run:
                try:
                    note_id = client.add_note(card.deck, DEFAULT_MODEL, fields, card.tags)
                    id_writeback[card.node_id] = note_id
                except Exception as e:
                    print(f'  ├─ WARN: "{card.front[:30]}" 跳过 — {e}')
                    stats["skipped"] += 1
                    continue
            stats["added"] += 1
            print(f'  ├─ 新建: "{card.front[:30]}" → {card.deck}')

    for d in deletions:
        if not dry_run:
            client.delete_notes([d.anki_id])
        stats["deleted"] += 1
        print(f'  └─ 删除: "{d.front}" [ID: {d.anki_id}] — 已取消标绿')

    if not dry_run:
        if id_writeback:
            _writeback_ids(canvas_path, id_writeback)
        if deletions:
            _clear_deleted_ids(canvas_path, [d.node_id for d in deletions])

    return stats


def _upload_media(text: str, vault_root: Path, client: AnkiClient) -> None:
    for match in re.finditer(r"!\[\[(.*?)\]\]", text):
        ref = match.group(1)
        filepath = vault_root / ref
        if not filepath.exists():
            # Obsidian wikilink 可能省略路径前缀，在 vault 内搜索文件名
            name = ref.rsplit("/", 1)[-1]
            found = list(vault_root.rglob(name))
            filepath = found[0] if found else filepath
        if filepath.exists():
            client.store_media_file(filepath.name, filepath.read_bytes())
        else:
            print(f"  ├─ WARN: 媒体文件不存在: {filepath}")


def _make_backlink(vault_name: str, canvas_rel_path: str) -> str:
    uri = f"obsidian://open?vault={quote(vault_name)}&file={quote(canvas_rel_path)}"
    return f'<br><a href="{uri}">📎 Canvas</a>'


def _writeback_ids(canvas_path: Path, id_map: dict[str, int]) -> None:
    with open(canvas_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for node in data["nodes"]:
        if node["id"] in id_map:
            text = re.sub(CARD_META_PATTERN, "", node.get("text", "")).rstrip()
            meta = json.dumps({"id": id_map[node["id"]]}, ensure_ascii=False)
            node["text"] = text + f"\n<!--card:{meta}-->"
    with open(canvas_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent="\t")


def _clear_deleted_ids(canvas_path: Path, node_ids: list[str]) -> None:
    with open(canvas_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for node in data["nodes"]:
        if node["id"] in node_ids:
            node["text"] = re.sub(CARD_META_PATTERN, "", node.get("text", "")).rstrip()
    with open(canvas_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent="\t")


def main():
    ap = argparse.ArgumentParser(description="将 Obsidian Canvas 卡片导出到 Anki")
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--dry-run", action="store_true", help="预览，不实际导出")
    ap.add_argument("--vault", type=Path, default=Path("."), help="vault 根目录")
    ap.add_argument("--vault-name", default="MyDigitalGarden", help="vault 名称（用于 URI）")
    args = ap.parse_args()

    client = AnkiClient()
    if not args.dry_run:
        try:
            ver = client.version()
            print(f"连接 AnkiConnect... OK (v{ver})")
        except ConnectionError as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print("DRY RUN 模式 — 不会导出到 Anki")

    total = {"added": 0, "updated": 0, "deleted": 0, "skipped": 0}

    for canvas_file in args.files:
        if not canvas_file.exists():
            print(f"错误: 文件不存在 {canvas_file}", file=sys.stderr)
            continue
        print(f"解析: {canvas_file}")
        try:
            stats = process_canvas(
                canvas_file, client,
                vault_root=args.vault.resolve(),
                vault_name=args.vault_name,
                dry_run=args.dry_run,
            )
            for k in total:
                total[k] += stats[k]
            if not args.dry_run:
                print(f"已回写 ID 到 {canvas_file}")
        except Exception as e:
            print(f"错误: 处理 {canvas_file} 失败: {e}", file=sys.stderr)

    print(f"\n结果: {total['added']} 新建, {total['updated']} 更新, "
          f"{total['skipped']} 跳过, {total['deleted']} 删除")


if __name__ == "__main__":
    main()
