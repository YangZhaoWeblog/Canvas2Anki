"""将 Obsidian markdown 转换为 Anki 兼容的 HTML。

转换管线：
1. 保护数学公式（$...$，$$...$$）和代码块，防止 markdown 处理破坏它们
2. 转换填空（==text== → {{c1::text}}）
3. 转换图片 wikilink（![[img]] → <img>）
4. 转换笔记 wikilink（[[note]] → Obsidian URI <a>）
5. Markdown → HTML（mistune）
6. 还原被保护的数学公式和代码块
"""

import re
from urllib.parse import quote

import mistune


def md_to_anki_html(text: str, vault: str = "MyDigitalGarden") -> str:
    """将 Obsidian 风格的 markdown 转换为 Anki 兼容的 HTML。"""
    protected: list[tuple[str, str]] = []

    def protect(content: str) -> str:
        placeholder = f"\x00PROT{len(protected)}\x00"
        protected.append((placeholder, content))
        return placeholder

    # 1. 保护块级数学公式 $$...$$
    def replace_block_math(m: re.Match) -> str:
        return protect(f"\\[{m.group(1).strip()}\\]")

    text = re.sub(r"\$\$(.*?)\$\$", replace_block_math, text, flags=re.DOTALL)

    # 2. 保护行内数学公式 $...$
    def replace_inline_math(m: re.Match) -> str:
        return protect(f"\\({m.group(1)}\\)")

    text = re.sub(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)", replace_inline_math, text)

    # 3. 保护代码块 ```...```
    def replace_code_block(m: re.Match) -> str:
        return protect(f"<pre><code>{m.group(1)}</code></pre>")

    text = re.sub(r"```(?:\w*)\n(.*?)```", replace_code_block, text, flags=re.DOTALL)

    # 4. 保护行内代码 `...`
    def replace_inline_code(m: re.Match) -> str:
        return protect(f"<code>{m.group(1)}</code>")

    text = re.sub(r"`([^`]+)`", replace_inline_code, text)

    # 5. 转换填空 ==text== → {{cN::text}}
    cloze_counter = 0

    def replace_cloze(m: re.Match) -> str:
        nonlocal cloze_counter
        cloze_counter += 1
        return f"{{{{c{cloze_counter}::{m.group(1)}}}}}"

    text = re.sub(r"==(.*?)==", replace_cloze, text)

    # 6. 转换图片 wikilink：![[路径/图片.png]] → <img src="图片.png">（保护，防转义）
    def replace_image(m: re.Match) -> str:
        filename = m.group(1).rsplit("/", 1)[-1]
        return protect(f'<img src="{filename}">')

    text = re.sub(r"!\[\[(.*?)\]\]", replace_image, text)

    # 7. 转换笔记 wikilink：[[笔记名]] → Obsidian URI
    def replace_wikilink(m: re.Match) -> str:
        note = m.group(1)
        uri = f"obsidian://open?vault={quote(vault)}&file={quote(note)}"
        return f'<a href="{uri}">{note}</a>'

    text = re.sub(r"\[\[([^\]]+)\]\]", replace_wikilink, text)

    # 8. Markdown → HTML
    html = mistune.create_markdown(plugins=["table"])(text)

    # 9. 还原被保护的内容
    for placeholder, original in protected:
        html = html.replace(placeholder, original)

    return html
