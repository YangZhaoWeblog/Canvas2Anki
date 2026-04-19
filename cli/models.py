"""canvas2anki 的卡片模型和常量。"""

from dataclasses import dataclass, field

# Obsidian Canvas 绿色对应的 color 字段值
GREEN_COLOR = "4"

# 未分组卡片的默认 deck
DEFAULT_DECK = "Default"

# 默认 Anki 笔记类型
DEFAULT_MODEL = "问答题"

# 从节点文本提取 <!--card:{...}--> 元数据的正则
CARD_META_PATTERN = r"<!--card:(.*?)-->"

# AnkiConnect 端点
ANKI_CONNECT_URL = "http://127.0.0.1:8765"
ANKI_CONNECT_VERSION = 6


@dataclass
class Card:
    """从 Canvas 节点提取的单张 Anki 卡片。"""

    node_id: str
    front: str
    back: str
    deck: str = DEFAULT_DECK
    tags: list[str] = field(default_factory=list)
    anki_id: int | None = None
    media_files: list[str] = field(default_factory=list)
