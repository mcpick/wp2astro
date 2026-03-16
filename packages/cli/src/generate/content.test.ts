import { describe, test, expect, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { writeContent } from "./content.js";
import type { AstroContent } from "../types.js";

const tmpDir = join(import.meta.dir, "__test_output__");

function setup(...dirs: string[]) {
  for (const d of dirs) {
    mkdirSync(join(tmpDir, "src", "content", d), { recursive: true });
  }
}

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("writeContent", () => {
  test("posts write to posts/", async () => {
    setup("posts");
    await writeContent(
      [{ slug: "hello", type: "post", frontmatter: { title: "Hi" }, markdown: "body" }],
      tmpDir,
    );
    expect(existsSync(join(tmpDir, "src/content/posts/hello.md"))).toBe(true);
  });

  test("pages write to pages/", async () => {
    setup("pages");
    await writeContent(
      [{ slug: "about", type: "page", frontmatter: { title: "About" }, markdown: "body" }],
      tmpDir,
    );
    expect(existsSync(join(tmpDir, "src/content/pages/about.md"))).toBe(true);
  });

  test("CPT writes to type directory", async () => {
    setup("project");
    await writeContent(
      [{ slug: "my-project", type: "project", frontmatter: { title: "P" }, markdown: "body" }],
      tmpDir,
    );
    expect(existsSync(join(tmpDir, "src/content/project/my-project.md"))).toBe(true);
  });
});
