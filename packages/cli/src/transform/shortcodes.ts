/**
 * Strip or convert WordPress shortcodes to plain HTML/markdown equivalents.
 */
export function processShortcodes(html: string): string {
  let result = html;

  // [caption] → <figure>
  result = result.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    (_, inner) => `<figure>${inner.trim()}</figure>`,
  );

  // [gallery] → remove (no meaningful conversion)
  result = result.replace(/\[gallery[^\]]*\]/gi, "");

  // [embed] → unwrap to just the URL
  result = result.replace(/\[embed\]([\s\S]*?)\[\/embed\]/gi, (_, url) => url.trim());

  // [video] / [audio] → remove (browser native elements don't convert well)
  result = result.replace(/\[(video|audio)[^\]]*\][\s\S]*?\[\/\1\]/gi, "");
  result = result.replace(/\[(video|audio)[^\]]*\/?\]/gi, "");

  // Generic self-closing shortcodes → strip
  result = result.replace(/\[[\w-]+[^\]]*\/\]/g, "");

  // Generic paired shortcodes → unwrap content
  result = result.replace(/\[([\w-]+)[^\]]*\]([\s\S]*?)\[\/\1\]/g, (_, _tag, content) => content);

  // Any remaining opening shortcodes → strip
  result = result.replace(/\[[\w-]+[^\]]*\]/g, "");

  return result;
}
