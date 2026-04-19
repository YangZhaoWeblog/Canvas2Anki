"""集成测试 — mock AnkiConnect，使用真实解析器和转换器。"""

import json
import shutil
from pathlib import Path
from unittest.mock import MagicMock

from canvas2anki import process_canvas

FIXTURES = Path(__file__).parent / "fixtures"


def _make_mock_client():
    client = MagicMock()
    client.version.return_value = 6
    client.create_deck.return_value = 1
    client.add_note.return_value = 9999999
    client.update_note_fields.return_value = None
    client.delete_notes.return_value = None
    client.store_media_file.return_value = "cert.png"
    return client


def test_process_new_card(tmp_path):
    """新绿色卡片 → addNote → ID 回写到 canvas。"""
    dst = tmp_path / "test.canvas"
    shutil.copy(FIXTURES / "simple.canvas", dst)

    result = process_canvas(dst, _make_mock_client(), vault_root=tmp_path, dry_run=False)

    assert result["added"] == 1
    assert result["updated"] == 0
    assert result["deleted"] == 0

    with open(dst) as f:
        data = json.load(f)
    green_node = next(n for n in data["nodes"] if n.get("color") == "4")
    assert "<!--card:" in green_node["text"]
    assert "9999999" in green_node["text"]


def test_process_dry_run_no_write(tmp_path):
    """dry-run 模式不应写回 canvas 也不应调用 AnkiConnect 变更 API。"""
    dst = tmp_path / "test.canvas"
    shutil.copy(FIXTURES / "simple.canvas", dst)
    original = dst.read_text()

    client = _make_mock_client()
    result = process_canvas(dst, client, vault_root=tmp_path, dry_run=True)

    assert result["added"] == 1
    client.add_note.assert_not_called()
    assert dst.read_text() == original


def test_process_deletion(tmp_path):
    """非绿色节点 + 有 ID → deleteNotes + 清除 canvas 中的 ID。"""
    dst = tmp_path / "test.canvas"
    shutil.copy(FIXTURES / "delete.canvas", dst)

    client = _make_mock_client()
    result = process_canvas(dst, client, vault_root=tmp_path, dry_run=False)

    assert result["deleted"] == 1
    client.delete_notes.assert_called_once_with([1776014384625])

    with open(dst) as f:
        data = json.load(f)
    assert "<!--card:" not in data["nodes"][0]["text"]


def test_update_failure_does_not_crash_remaining(tmp_path):
    """update_note_fields 抛异常 → 不应终止整个文件处理，后续卡片继续。"""
    canvas_data = {
        "nodes": [
            {
                "id": "n1", "x": 0, "y": 0, "width": 100, "height": 50,
                "type": "text", "color": "4",
                "text": "Q1?\n---\nA1\n<!--card:{\"id\":111}-->",
            },
            {
                "id": "n2", "x": 0, "y": 200, "width": 100, "height": 50,
                "type": "text", "color": "4",
                "text": "Q2?\n---\nA2\n<!--card:{\"id\":222}-->",
            },
        ],
        "edges": [],
    }
    dst = tmp_path / "test.canvas"
    with open(dst, "w") as f:
        json.dump(canvas_data, f)

    client = _make_mock_client()
    # 第一张卡更新失败
    client.update_note_fields.side_effect = [Exception("network timeout"), None]

    result = process_canvas(dst, client, vault_root=tmp_path, dry_run=False)

    # 第二张卡应该正常更新，不应被第一张的失败拖垮
    assert result["updated"] >= 1
    assert result["skipped"] >= 1


def test_add_note_failure_no_id_writeback(tmp_path):
    """add_note 失败 → canvas 不应被写入该卡的 ID。"""
    canvas_data = {
        "nodes": [{
            "id": "n1", "x": 0, "y": 0, "width": 100, "height": 50,
            "type": "text", "color": "4",
            "text": "Q?\n---\nA",
        }],
        "edges": [],
    }
    dst = tmp_path / "test.canvas"
    with open(dst, "w") as f:
        json.dump(canvas_data, f)

    client = _make_mock_client()
    client.add_note.side_effect = Exception("duplicate")

    result = process_canvas(dst, client, vault_root=tmp_path, dry_run=False)

    assert result["skipped"] == 1
    with open(dst) as f:
        data = json.load(f)
    # 失败的卡不应有 ID 回写
    assert "<!--card:" not in data["nodes"][0]["text"]


def test_writeback_ids_correctness(tmp_path):
    """_writeback_ids 回写后，canvas JSON 结构完好，ID 正确嵌入。"""
    from canvas2anki import _writeback_ids

    canvas_data = {
        "nodes": [
            {
                "id": "n1", "type": "text", "color": "4",
                "x": 0, "y": 0, "width": 100, "height": 50,
                "text": "Q?\n---\nA",
            },
            {
                "id": "n2", "type": "text",
                "x": 200, "y": 0, "width": 100, "height": 50,
                "text": "骨架",
            },
        ],
        "edges": [],
    }
    dst = tmp_path / "test.canvas"
    with open(dst, "w") as f:
        json.dump(canvas_data, f)

    _writeback_ids(dst, {"n1": 9876543210})

    with open(dst) as f:
        data = json.load(f)

    n1 = next(n for n in data["nodes"] if n["id"] == "n1")
    n2 = next(n for n in data["nodes"] if n["id"] == "n2")

    # n1 应有 ID 且 JSON 合法
    assert '<!--card:{"id": 9876543210}-->' in n1["text"]
    # n2 不应被改动
    assert n2["text"] == "骨架"
    # 整个 canvas JSON 仍然合法
    assert "nodes" in data
    assert len(data["nodes"]) == 2


def test_process_edge_image_upload_and_html(tmp_path):
    """卡片 edge→图片：媒体被上传 + HTML 最终包含 <img>。"""
    # 创建 vault 结构 + 图片文件
    media_dir = tmp_path / "附件"
    media_dir.mkdir()
    img = media_dir / "cert_what.png"
    img.write_bytes(b"\x89PNG_FAKE_DATA")

    dst = tmp_path / "test.canvas"
    shutil.copy(FIXTURES / "edges.canvas", dst)

    client = _make_mock_client()
    result = process_canvas(dst, client, vault_root=tmp_path, dry_run=False)

    assert result["added"] == 1

    # 媒体被上传
    client.store_media_file.assert_called_once()
    call_args = client.store_media_file.call_args
    assert call_args[0][0] == "cert_what.png"
    assert call_args[0][1] == b"\x89PNG_FAKE_DATA"

    # addNote 的背面 HTML 包含 <img>
    add_call = client.add_note.call_args
    back_html = add_call[0][2]["背面"]  # fields dict 的 "背面" 字段
    assert '<img src="cert_what.png">' in back_html


def test_upload_media_finds_file_in_subdirectory(tmp_path):
    """![[image.png]] 无路径前缀，文件在 附件/ 子目录 → 应找到并上传。"""
    from canvas2anki import _upload_media

    media_dir = tmp_path / "附件"
    media_dir.mkdir()
    img = media_dir / "Pasted image 123.png"
    img.write_bytes(b"\x89PNG_DATA")

    client = MagicMock()
    _upload_media("答案\n\n![[Pasted image 123.png]]", tmp_path, client)

    client.store_media_file.assert_called_once()
    assert client.store_media_file.call_args[0][0] == "Pasted image 123.png"
    assert client.store_media_file.call_args[0][1] == b"\x89PNG_DATA"
