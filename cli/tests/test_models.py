from models import Card, GREEN_COLOR, CARD_META_PATTERN
import json
import re


def test_card_creation():
    card = Card(
        node_id="abc123",
        front="椭圆曲线加法的几何意义？",
        back="两点连线交曲线第三点，关于x轴对称",
        deck="ALL::中间难度::密码学",
        tags=["密码学"],
    )
    assert card.front == "椭圆曲线加法的几何意义？"
    assert card.back == "两点连线交曲线第三点，关于x轴对称"
    assert card.deck == "ALL::中间难度::密码学"
    assert card.anki_id is None
    assert card.tags == ["密码学"]


def test_card_with_anki_id():
    card = Card(
        node_id="abc123",
        front="Q",
        back="A",
        deck="Default",
        anki_id=1776014384623,
    )
    assert card.anki_id == 1776014384623


def test_green_color_constant():
    assert GREEN_COLOR == "4"


def test_card_meta_pattern_extracts_json():
    text = "some text\n<!--card:{\"id\":123}-->"
    match = re.search(CARD_META_PATTERN, text)
    assert match is not None
    meta = json.loads(match.group(1))
    assert meta["id"] == 123


def test_card_meta_pattern_no_match():
    text = "没有元数据的普通文本"
    match = re.search(CARD_META_PATTERN, text)
    assert match is None
