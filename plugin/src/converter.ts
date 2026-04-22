import { marked } from "marked";

export function mdToAnkiHtml(text: string, vault = "MyDigitalGarden"): string {
  const protectedItems: [string, string][] = [];

  function protect(content: string): string {
    const placeholder = `\x00PROT${protectedItems.length}\x00`;
    protectedItems.push([placeholder, content]);
    return placeholder;
  }

  // 1. Protect block math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) =>
    protect(`\\[${inner.trim()}\\]`)
  );

  // 2. Protect inline math $...$
  text = text.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, inner) =>
    protect(`\\(${inner}\\)`)
  );

  // 3. Protect code blocks ```...```
  text = text.replace(/```(?:\w*)\n([\s\S]*?)```/g, (_, inner) =>
    protect(`<pre><code>${inner}</code></pre>`)
  );

  // 4. Protect inline code `...`
  text = text.replace(/`([^`]+)`/g, (_, inner) =>
    protect(`<code>${inner}</code>`)
  );

  // 5. Highlight ==text== → <mark>
  text = text.replace(/==(.*?)==/g, (_, inner) =>
    protect(`<mark>${inner}</mark>`)
  );

  // 6. Image wikilinks ![[path/image.png]] → <img>
  text = text.replace(/!\[\[(.*?)\]\]/g, (_, path) => {
    const filename = path.split("/").pop() ?? path;
    return protect(`<img src="${filename}">`);
  });

  // 7. Note wikilinks [[note]] → obsidian URI
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, note) => {
    const uri = `obsidian://open?vault=${vault}&file=${note}`;
    return protect(`<a href="${uri}">${note}</a>`);
  });

  // 8. Markdown → HTML
  let html = marked.parse(text, { async: false }) as string;

  // 9. Restore protected items
  for (const [placeholder, original] of protectedItems) {
    html = html.replace(placeholder, original);
  }

  return html;
}
