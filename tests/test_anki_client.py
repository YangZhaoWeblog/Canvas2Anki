import json
import pytest
from unittest.mock import patch, MagicMock
from anki_client import AnkiClient


def _mock_response(result, error=None):
    resp = MagicMock()
    body = json.dumps({"result": result, "error": error}).encode()
    resp.read.return_value = body
    resp.__enter__ = lambda s: s
    resp.__exit__ = MagicMock(return_value=False)
    return resp


@patch("anki_client.urllib.request.urlopen")
def test_version(mock_urlopen):
    mock_urlopen.return_value = _mock_response(6)
    assert AnkiClient().version() == 6


@patch("anki_client.urllib.request.urlopen")
def test_add_note(mock_urlopen):
    mock_urlopen.return_value = _mock_response(1776014384623)
    client = AnkiClient()
    note_id = client.add_note(
        deck="ALL::密码学",
        model="问答题",
        fields={"正面": "Q", "背面": "A"},
        tags=["密码学"],
    )
    assert note_id == 1776014384623
    payload = json.loads(mock_urlopen.call_args[0][0].data)
    assert payload["action"] == "addNote"
    assert payload["params"]["note"]["deckName"] == "ALL::密码学"


@patch("anki_client.urllib.request.urlopen")
def test_update_note_fields(mock_urlopen):
    mock_urlopen.return_value = _mock_response(None)
    AnkiClient().update_note_fields(1776014384623, {"正面": "Q2", "背面": "A2"})
    payload = json.loads(mock_urlopen.call_args[0][0].data)
    assert payload["action"] == "updateNoteFields"
    assert payload["params"]["note"]["id"] == 1776014384623


@patch("anki_client.urllib.request.urlopen")
def test_delete_notes(mock_urlopen):
    mock_urlopen.return_value = _mock_response(None)
    AnkiClient().delete_notes([1776014384623])
    payload = json.loads(mock_urlopen.call_args[0][0].data)
    assert payload["action"] == "deleteNotes"
    assert 1776014384623 in payload["params"]["notes"]


@patch("anki_client.urllib.request.urlopen")
def test_create_deck(mock_urlopen):
    mock_urlopen.return_value = _mock_response(1234)
    AnkiClient().create_deck("ALL::密码学")
    payload = json.loads(mock_urlopen.call_args[0][0].data)
    assert payload["action"] == "createDeck"


@patch("anki_client.urllib.request.urlopen")
def test_store_media(mock_urlopen):
    mock_urlopen.return_value = _mock_response("cert.png")
    result = AnkiClient().store_media_file("cert.png", b"\x89PNG...")
    assert result == "cert.png"


@patch("anki_client.urllib.request.urlopen")
def test_error_response_raises(mock_urlopen):
    mock_urlopen.return_value = _mock_response(None, error="model not found")
    with pytest.raises(Exception, match="model not found"):
        AnkiClient().add_note("deck", "bad_model", {"正面": "Q", "背面": "A"})


@patch("anki_client.urllib.request.urlopen")
def test_connection_error(mock_urlopen):
    mock_urlopen.side_effect = ConnectionRefusedError("refused")
    with pytest.raises(ConnectionError):
        AnkiClient().version()
