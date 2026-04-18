"""AnkiConnect HTTP 客户端。

通过 127.0.0.1:8765 与 Anki 的 AnkiConnect 插件通信。
仅使用标准库 urllib，无外部依赖。
"""

import base64
import json
import urllib.error
import urllib.request

from models import ANKI_CONNECT_URL, ANKI_CONNECT_VERSION


class AnkiClient:
    """AnkiConnect REST API 的薄封装。"""

    def __init__(self, url: str = ANKI_CONNECT_URL):
        self.url = url

    def _request(self, action: str, **params):
        payload = {"action": action, "version": ANKI_CONNECT_VERSION, "params": params}
        req = urllib.request.Request(
            self.url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req) as resp:
                body = json.loads(resp.read())
        except (urllib.error.URLError, ConnectionRefusedError, OSError) as e:
            raise ConnectionError(
                "无法连接 AnkiConnect。请确认 Anki 已打开且 AnkiConnect 插件已安装。"
            ) from e

        if body.get("error"):
            raise Exception(f"AnkiConnect 错误: {body['error']}")

        return body.get("result")

    def version(self) -> int:
        return self._request("version")

    def create_deck(self, deck: str) -> int:
        return self._request("createDeck", deck=deck)

    def add_note(self, deck: str, model: str, fields: dict, tags: list | None = None) -> int:
        note = {
            "deckName": deck,
            "modelName": model,
            "fields": fields,
            "tags": tags or [],
            "options": {"allowDuplicate": True},
        }
        return self._request("addNote", note=note)

    def update_note_fields(self, note_id: int, fields: dict) -> None:
        self._request("updateNoteFields", note={"id": note_id, "fields": fields})

    def delete_notes(self, note_ids: list[int]) -> None:
        self._request("deleteNotes", notes=note_ids)

    def store_media_file(self, filename: str, data: bytes) -> str:
        b64 = base64.b64encode(data).decode("ascii")
        return self._request("storeMediaFile", filename=filename, data=b64)

    def multi(self, actions: list[dict]) -> list:
        return self._request("multi", actions=actions)
