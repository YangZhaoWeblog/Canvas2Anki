from converter import md_to_anki_html


def test_plain_text():
    assert "<p>hello</p>" in md_to_anki_html("hello")


def test_bold():
    html = md_to_anki_html("**bold**")
    assert "<strong>bold</strong>" in html


def test_inline_math():
    html = md_to_anki_html("公式 $x^2 + y^2 = r^2$ 结束")
    assert "\\(x^2 + y^2 = r^2\\)" in html
    assert "$" not in html


def test_block_math():
    html = md_to_anki_html("公式：\n$$\n\\sum_{i=1}^n i\n$$\n结束")
    assert "\\[" in html
    assert "\\sum_{i=1}^n i" in html
    assert "$$" not in html


def test_math_not_corrupted_by_markdown():
    """含下划线的数学公式不应被转为 <em>。"""
    html = md_to_anki_html("$a_1 + a_2$")
    assert "\\(a_1 + a_2\\)" in html
    assert "<em>" not in html


def test_code_block_preserved():
    html = md_to_anki_html("```\ncode_here\n```")
    assert "code_here" in html
    assert "<em>" not in html


def test_image_wikilink():
    html = md_to_anki_html("答案\n![[附件/cert.png]]")
    assert '<img src="cert.png">' in html
    assert "![[" not in html


def test_wikilink_to_obsidian_uri():
    html = md_to_anki_html("参考 [[数字证书]]", vault="MyDigitalGarden")
    assert "obsidian://open" in html
    assert "数字证书" in html


def test_highlight_to_cloze():
    html = md_to_anki_html("这是 ==重要内容== 结尾")
    assert "{{c1::重要内容}}" in html
    assert "==" not in html


def test_multiple_clozes_numbered():
    html = md_to_anki_html("==第一个== 和 ==第二个==")
    assert "{{c1::第一个}}" in html
    assert "{{c2::第二个}}" in html


def test_table():
    md = "| 列1 | 列2 |\n| --- | --- |\n| a | b |"
    html = md_to_anki_html(md)
    assert "<table>" in html
    assert "<td>" in html
