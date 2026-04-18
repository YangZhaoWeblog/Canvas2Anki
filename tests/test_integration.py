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
