import { describe, test, expect } from "bun:test";
import { extractNavFromHTML } from "./extract-nav.js";

describe("extractNavFromHTML", () => {
  test("extracts flat menu items", () => {
    const html = `<html><body><nav class="main-navigation"><ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul></nav></body></html>`;

    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ label: "Home", href: "/", children: [] });
    expect(items[1]).toEqual({ label: "About", href: "/about", children: [] });
  });

  test("extracts nested submenu items", () => {
    const html = `<html><body><nav class="primary-navigation"><ul>
      <li class="menu-item-has-children">
        <a href="/services">Services</a>
        <ul>
          <li><a href="/services/web">Web</a></li>
          <li><a href="/services/mobile">Mobile</a></li>
        </ul>
      </li>
      <li><a href="/about">About</a></li>
    </ul></nav></body></html>`;

    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe("Services");
    expect(items[0].children).toHaveLength(2);
    expect(items[0].children[0].label).toBe("Web");
    expect(items[0].children[0].href).toBe("/services/web");
  });

  test("tries fallback selectors", () => {
    const html = `<html><body><header><nav><ul>
      <li><a href="/">Home</a></li>
    </ul></nav></header></body></html>`;

    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(1);
  });

  test("returns empty for no nav", () => {
    const html = `<html><body><div>No nav here</div></body></html>`;
    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(0);
  });

  test("handles nav with role attribute", () => {
    const html = `<html><body><nav role="navigation"><ul>
      <li><a href="/blog">Blog</a></li>
    </ul></nav></body></html>`;

    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Blog");
  });

  test("returns empty when nav has no ul", () => {
    const html = `<html><body><nav><a href="/">Home</a></nav></body></html>`;
    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(0);
  });

  test("skips li without anchor tags", () => {
    const html = `<html><body><nav><ul>
      <li><a href="/">Home</a></li>
      <li><span>Divider</span></li>
      <li><a href="/about">About</a></li>
    </ul></nav></body></html>`;
    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(2);
  });

  test("defaults to # when href missing", () => {
    const html = `<html><body><nav><ul>
      <li><a>No Link</a></li>
    </ul></nav></body></html>`;
    const items = extractNavFromHTML(html);
    expect(items[0].href).toBe("#");
  });

  test("handles deeply nested submenus", () => {
    const html = `<html><body><nav><ul>
      <li>
        <a href="/a">A</a>
        <ul>
          <li>
            <a href="/a/b">B</a>
            <ul>
              <li><a href="/a/b/c">C</a></li>
            </ul>
          </li>
        </ul>
      </li>
    </ul></nav></body></html>`;

    const items = extractNavFromHTML(html);
    expect(items).toHaveLength(1);
    expect(items[0].children[0].children[0].label).toBe("C");
  });
});
