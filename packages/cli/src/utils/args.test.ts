import { describe, test, expect } from "bun:test";
import { parse } from "./args.js";

describe("parse", () => {
  test("convert command", () => {
    const result = parse(["convert"]);
    expect(result.command).toBe("convert");
  });

  test("--url flag", () => {
    const result = parse(["convert", "--url", "https://example.com"]);
    expect(result.url).toBe("https://example.com");
  });

  test("-u short flag", () => {
    const result = parse(["convert", "-u", "https://example.com"]);
    expect(result.url).toBe("https://example.com");
  });

  test("--output default", () => {
    const result = parse(["convert"]);
    expect(result.output).toBe("./output");
  });

  test("--output custom", () => {
    const result = parse(["convert", "--output", "./my-dir"]);
    expect(result.output).toBe("./my-dir");
  });

  test("--no-images flag", () => {
    const result = parse(["convert", "--no-images"]);
    expect(result.downloadImages).toBe(false);
  });

  test("images enabled by default", () => {
    const result = parse(["convert"]);
    expect(result.downloadImages).toBe(true);
  });

  test("--help flag", () => {
    const result = parse(["--help"]);
    expect(result.help).toBe(true);
  });

  test("-h short flag", () => {
    const result = parse(["-h"]);
    expect(result.help).toBe(true);
  });

  test("--version flag", () => {
    const result = parse(["--version"]);
    expect(result.version).toBe(true);
  });

  test("-v short flag", () => {
    const result = parse(["-v"]);
    expect(result.version).toBe(true);
  });

  test("--scaffold flag", () => {
    const result = parse(["convert", "--scaffold"]);
    expect(result.scaffold).toBe(true);
  });

  test("scaffold disabled by default", () => {
    const result = parse(["convert"]);
    expect(result.scaffold).toBe(false);
  });

  test("missing command", () => {
    const result = parse([]);
    expect(result.command).toBe("");
  });
});
