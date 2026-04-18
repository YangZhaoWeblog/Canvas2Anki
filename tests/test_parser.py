import json
import tempfile
from pathlib import Path
from parser import parse_canvas

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_simple_canvas():
    cards, warnings, deletions = parse_canvas(FIXTURES / "simple.canvas")
    assert len(cards) == 1
    card = cards[0]
    assert card.node_id == "node1"
    assert card.front == "椭圆曲线加法的几何意义？"
    assert card.back == "两点连线交曲线第三点，关于x轴对称"
    assert card.deck == "Default"
    assert card.anki_id is None


def test_parse_skips_non_green_nodes():
    cards, warnings, deletions = parse_canvas(FIXTURES / "simple.canvas")
    assert len(cards) == 1
    assert cards[0].node_id == "node1"


def test_parse_warns_green_without_separator():
    cards, warnings, deletions = parse_canvas(FIXTURES / "no_separator.canvas")
    assert len(cards) == 0
    assert len(warnings) == 1
    assert "绿色但没有分隔符" in warnings[0] or "node1" in warnings[0]


def test_parse_extracts_existing_id():
    canvas_data = {
        "nodes": [{
            "id": "n1",
            "x": 0, "y": 0, "width": 100, "height": 50,
            "type": "text",
            "color": "4",
            "text": "问题？\n---\n答案\n<!--card:{\"id\":1776014384623}-->",
        }],
        "edges": [],
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".canvas", delete=False) as f:
        json.dump(canvas_data, f)
        f.flush()
        cards, _, _ = parse_canvas(Path(f.name))
    assert cards[0].anki_id == 1776014384623


def test_parse_table_separator_not_triggered():
    """表格里的 | --- | 不应触发 Q/A 分割。"""
    canvas_data = {
        "nodes": [{
            "id": "n1",
            "x": 0, "y": 0, "width": 100, "height": 50,
            "type": "text",
            "color": "4",
            "text": "问题？\n---\n答案\n\n| 列1 | 列2 |\n| --- | --- |\n| a | b |",
        }],
        "edges": [],
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".canvas", delete=False) as f:
        json.dump(canvas_data, f)
        f.flush()
        cards, _, _ = parse_canvas(Path(f.name))
    assert cards[0].front == "问题？"
    assert "| 列1 | 列2 |" in cards[0].back


def test_parse_edges_append_to_back():
    cards, warnings, deletions = parse_canvas(FIXTURES / "edges.canvas")
    assert len(cards) == 1
    card = cards[0]
    assert card.front == "数字证书是什么？"
    assert "由CA签发的电子文件" in card.back
    assert "![[附件/cert_what.png]]" in card.back
    assert "绑定：身份+公钥+CA签名" in card.back


def test_parse_edges_sorted_by_y():
    """图片节点 y=50，文字节点 y=200 — 图片应先出现。"""
    cards, _, _ = parse_canvas(FIXTURES / "edges.canvas")
    card = cards[0]
    img_pos = card.back.find("![[附件/cert_what.png]]")
    text_pos = card.back.find("绑定：身份+公钥+CA签名")
    assert img_pos < text_pos


def test_parse_multi_group_deck():
    cards, _, _ = parse_canvas(FIXTURES / "multi_group.canvas")
    decks = {c.front: c.deck for c in cards}
    assert decks["ECDSA签名流程？"] == "ALL::中间难度::密码学"
    assert decks["证书链怎么验证？"] == "ALL::中间难度::PKI"
    assert decks["孤立卡片？"] == "Default"


def test_parse_deletion_candidates():
    cards, warnings, deletions = parse_canvas(FIXTURES / "delete.canvas")
    assert len(cards) == 0
    assert len(deletions) == 1
    assert deletions[0].anki_id == 1776014384625

