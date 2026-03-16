import TurndownService from "turndown";

let service: TurndownService | null = null;

function getService(): TurndownService {
  if (service) return service;

  service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    hr: "---",
  });

  // Strip Gutenberg block comments
  service.addRule("gutenberg-comments", {
    filter: (node) => node.nodeType === 8, // Comment node
    replacement: () => "",
  });

  // <figure> with <img> and <figcaption>
  service.addRule("figure", {
    filter: "figure",
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const img = el.querySelector("img");
      const caption = el.querySelector("figcaption");
      if (!img) return _content;
      const src = img.getAttribute("src") ?? "";
      const alt = caption?.textContent?.trim() ?? img.getAttribute("alt") ?? "";
      return `\n\n![${alt}](${src})\n\n`;
    },
  });

  // Don't double-convert figcaption (handled by figure rule)
  service.addRule("figcaption", {
    filter: "figcaption",
    replacement: () => "",
  });

  // WordPress code blocks: <pre><code>
  service.addRule("wp-code-block", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        node.firstChild !== null &&
        node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const code = el.querySelector("code");
      if (!code) return _content;
      const lang = code.className?.match(/language-(\w+)/)?.[1] ?? "";
      const text = code.textContent ?? "";
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    },
  });

  // WordPress embeds (iframes) → link
  service.addRule("iframe", {
    filter: "iframe",
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const src = el.getAttribute("src");
      if (!src) return "";
      return `\n\n[Embedded content](${src})\n\n`;
    },
  });

  return service;
}

export function htmlToMarkdown(html: string): string {
  // Strip Gutenberg comments before turndown (regex for <!-- wp: ... -->)
  let cleaned = html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "");

  // Normalize whitespace between block elements
  cleaned = cleaned.replace(/>\s+</g, ">\n<");

  const md = getService().turndown(cleaned);

  // Clean up excessive blank lines
  return md.replace(/\n{3,}/g, "\n\n").trim();
}
