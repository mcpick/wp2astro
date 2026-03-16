import { describe, test, expect } from "bun:test";
import { processShortcodes, extractGalleryIds } from "./shortcodes.js";

describe("extractGalleryIds", () => {
  test("parses ids from gallery shortcode", () => {
    expect(extractGalleryIds('[gallery ids="1,2,3"]')).toEqual([1, 2, 3]);
  });

  test("handles single quotes", () => {
    expect(extractGalleryIds("[gallery ids='10,20']")).toEqual([10, 20]);
  });

  test("returns empty for gallery without ids", () => {
    expect(extractGalleryIds("[gallery columns=3]")).toEqual([]);
  });

  test("returns empty for no galleries", () => {
    expect(extractGalleryIds("<p>No galleries here</p>")).toEqual([]);
  });

  test("handles multiple galleries", () => {
    const html = '[gallery ids="1,2"] text [gallery ids="3,4"]';
    expect(extractGalleryIds(html)).toEqual([1, 2, 3, 4]);
  });

  test("handles extra attributes", () => {
    expect(extractGalleryIds('[gallery columns="3" ids="5,6" size="medium"]')).toEqual([5, 6]);
  });
});

describe("processShortcodes", () => {
  test("caption → figure", () => {
    const input = '[caption id="x" width="300"]<img src="a.jpg" /> My caption[/caption]';
    expect(processShortcodes(input)).toBe("<figure><img src=\"a.jpg\" /> My caption</figure>");
  });

  test("gallery with ids replaced with marker", () => {
    const input = 'before [gallery ids="1,2,3"] after';
    expect(processShortcodes(input)).toBe("before <!-- wp-gallery:1,2,3 --> after");
  });

  test("gallery without ids stripped", () => {
    const input = "before [gallery columns=3] after";
    expect(processShortcodes(input)).toBe("before  after");
  });

  test("embed unwrapped", () => {
    const input = "[embed]https://youtube.com/watch?v=abc[/embed]";
    expect(processShortcodes(input)).toBe("https://youtube.com/watch?v=abc");
  });

  test("video paired removed", () => {
    const input = '[video src="a.mp4"]content[/video]';
    expect(processShortcodes(input)).toBe("");
  });

  test("audio self-closing removed", () => {
    const input = '[audio src="a.mp3" /]';
    expect(processShortcodes(input)).toBe("");
  });

  test("generic paired unwraps content", () => {
    const input = "[highlight]important text[/highlight]";
    expect(processShortcodes(input)).toBe("important text");
  });

  test("generic self-closing stripped", () => {
    const input = "before [spacer height=20 /] after";
    expect(processShortcodes(input)).toBe("before  after");
  });

  test("hyphenated shortcode names handled", () => {
    const input = "[contact-form]form content[/contact-form]";
    expect(processShortcodes(input)).toBe("form content");
  });

  test("hyphenated self-closing stripped", () => {
    const input = "before [my-widget id=1 /] after";
    expect(processShortcodes(input)).toBe("before  after");
  });

  test("remaining opening shortcodes stripped", () => {
    const input = "before [some-thing attr=1] after";
    expect(processShortcodes(input)).toBe("before  after");
  });

  test("no-op on clean HTML", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(processShortcodes(input)).toBe(input);
  });

  test("nested shortcodes unwrap outer then inner remnant stripped", () => {
    const input = "[outer][inner]text[/inner][/outer]";
    const result = processShortcodes(input);
    // Inner closing tag remains after outer pair match, then gets stripped as remaining tag
    expect(result).not.toContain("[outer]");
    expect(result).toContain("text");
  });
});
