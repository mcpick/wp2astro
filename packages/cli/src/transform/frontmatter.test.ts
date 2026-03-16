import { describe, test, expect } from "bun:test";
import { serializeFrontmatter } from "./frontmatter.js";

describe("serializeFrontmatter", () => {
  test("string values", () => {
    const result = serializeFrontmatter({ title: "Hello World" });
    expect(result).toBe("---\ntitle: Hello World\n---");
  });

  test("number values", () => {
    const result = serializeFrontmatter({ count: 42 });
    expect(result).toBe("---\ncount: 42\n---");
  });

  test("boolean values", () => {
    const result = serializeFrontmatter({ draft: true });
    expect(result).toBe("---\ndraft: true\n---");
  });

  test("date values", () => {
    const d = new Date("2024-01-15T10:00:00Z");
    const result = serializeFrontmatter({ date: d });
    expect(result).toContain("date: 2024-01-15T10:00:00.000Z");
  });

  test("array values", () => {
    const result = serializeFrontmatter({ tags: ["a", "b"] });
    expect(result).toBe("---\ntags:\n  - a\n  - b\n---");
  });

  test("null/undefined skipped", () => {
    const result = serializeFrontmatter({ a: null, b: undefined, c: "yes" });
    expect(result).not.toContain("a:");
    expect(result).not.toContain("b:");
    expect(result).toContain('c: "yes"');
  });

  test("empty array skipped", () => {
    const result = serializeFrontmatter({ tags: [] });
    expect(result).toBe("---\n---");
  });

  test("colon in string quoted", () => {
    const result = serializeFrontmatter({ title: "key: value" });
    expect(result).toContain('"key: value"');
  });

  test("hash in string quoted", () => {
    const result = serializeFrontmatter({ title: "C# Guide" });
    expect(result).toContain('"C# Guide"');
  });

  test("quotes in string escaped", () => {
    const result = serializeFrontmatter({ title: 'He said "hi"' });
    expect(result).toContain('He said \\"hi\\"');
  });

  test("empty string quoted", () => {
    const result = serializeFrontmatter({ title: "" });
    expect(result).toContain('title: ""');
  });

  test("numeric string quoted", () => {
    const result = serializeFrontmatter({ title: "2025" });
    expect(result).toContain('"2025"');
  });

  test("single digit numeric string quoted", () => {
    const result = serializeFrontmatter({ title: "5" });
    expect(result).toContain('"5"');
  });

  test("YAML reserved words quoted", () => {
    for (const word of ["true", "false", "null", "yes", "no", "True", "YES"]) {
      const result = serializeFrontmatter({ title: word });
      expect(result).toContain(`"${word}"`);
    }
  });

  test("string starting with [ quoted", () => {
    const result = serializeFrontmatter({ title: "[draft]" });
    expect(result).toContain('"[draft]"');
  });

  test("string starting with { quoted", () => {
    const result = serializeFrontmatter({ title: "{value}" });
    expect(result).toContain('"{value}"');
  });
});
