import { describe, test, expect } from "bun:test";
import { extractLayoutFromHTML, detectHero } from "./extract-layout.js";
import { parse } from "node-html-parser";

describe("extractLayoutFromHTML", () => {
  test("full-width when no sidebar", () => {
    const html = `<html><body><main><article>Content</article></main></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.layoutType).toBe("full-width");
    expect(layout.sidebarDetected).toBe(false);
    expect(layout.hasSidebar).toBe(false);
  });

  test("detects sidebar with aside element", () => {
    const html = `<html><body><div><main>Content</main><aside>Sidebar</aside></div></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.sidebarDetected).toBe(true);
    expect(layout.hasSidebar).toBe(true);
    expect(layout.layoutType).toBe("sidebar-right");
  });

  test("detects sidebar with .sidebar class", () => {
    const html = `<html><body><div><main>Content</main><div class="sidebar">Widgets</div></div></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.sidebarDetected).toBe(true);
  });

  test("detects sidebar with #sidebar id", () => {
    const html = `<html><body><div><main>Content</main><div id="sidebar">Widgets</div></div></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.sidebarDetected).toBe(true);
  });

  test("detects sidebar-left when sidebar before main", () => {
    const html = `<html><body><div><aside>Sidebar</aside><main>Content</main></div></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.layoutType).toBe("sidebar-left");
  });

  test("detects widget-area", () => {
    const html = `<html><body><div><main>Content</main><div class="widget-area">Widgets</div></div></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.sidebarDetected).toBe(true);
  });
  test("returns full-width for empty body", () => {
    const layout = extractLayoutFromHTML(`<html><body></body></html>`);
    expect(layout.layoutType).toBe("full-width");
    expect(layout.hasHero).toBe(false);
  });

  test("detects sidebar with role='complementary'", () => {
    const html = `<html><body><div><main>Content</main><div role="complementary">Side</div></div></body></html>`;
    const layout = extractLayoutFromHTML(html);
    expect(layout.sidebarDetected).toBe(true);
  });
});

describe("detectHero", () => {
  test("detects hero class", () => {
    const root = parse(`<div class="hero-section"><h1>Welcome</h1></div>`);
    expect(detectHero(root)).toBe(true);
  });

  test("detects banner class", () => {
    const root = parse(`<div class="site-banner"><h1>Welcome</h1></div>`);
    expect(detectHero(root)).toBe(true);
  });

  test("detects wp-block-cover", () => {
    const root = parse(`<div class="wp-block-cover"><h1>Welcome</h1></div>`);
    expect(detectHero(root)).toBe(true);
  });

  test("no hero when absent", () => {
    const root = parse(`<main><article>Content only</article></main>`);
    expect(detectHero(root)).toBe(false);
  });

  test("detects large image in header", () => {
    const root = parse(`<header><img src="hero.jpg" width="1200" height="600"></header>`);
    expect(detectHero(root)).toBe(true);
  });

  test("detects image at exact threshold width 600", () => {
    const root = parse(`<header><img src="hero.jpg" width="600" height="400"></header>`);
    expect(detectHero(root)).toBe(true);
  });

  test("no hero for small header image", () => {
    const root = parse(`<header><img src="thumb.jpg" width="599" height="400"></header>`);
    expect(detectHero(root)).toBe(false);
  });
});
