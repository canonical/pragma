import { describe, expect, it } from "vitest";
import { parsePackDeclaration, redactUrl } from "./parseRef.js";

describe("redactUrl", () => {
  it("strips user:password userinfo so an inlined token never reaches output", () => {
    expect(redactUrl("https://alice:ghp_SECRET@github.com/org/repo.git")).toBe(
      "https://***@github.com/org/repo.git",
    );
  });

  it("strips a token-as-username (no colon)", () => {
    expect(redactUrl("https://ghp_SECRET@github.com/org/repo.git")).toBe(
      "https://***@github.com/org/repo.git",
    );
  });

  it("redacts across a compound scheme (git+https)", () => {
    expect(redactUrl("git+https://user:tok@host.example/x.git")).toBe(
      "git+https://***@host.example/x.git",
    );
  });

  it("leaves a credential-free URL unchanged", () => {
    expect(redactUrl("https://github.com/org/repo.git")).toBe(
      "https://github.com/org/repo.git",
    );
  });

  it("does not treat an '@' after the first path slash as userinfo", () => {
    expect(redactUrl("https://host.example/org/@scope/pkg")).toBe(
      "https://host.example/org/@scope/pkg",
    );
  });
});

describe("parsePackDeclaration — a git source may name a subdirectory", () => {
  const url = "git+https://github.com/org/repo.git";

  it("reaches a package nested in a monorepo", () => {
    expect(
      parsePackDeclaration({
        name: "@org/thing",
        source: `${url}#main:pkgs/thing`,
      }),
    ).toEqual({
      kind: "git",
      pkg: "@org/thing",
      url: "https://github.com/org/repo.git",
      ref: "main",
      subdir: "pkgs/thing",
      source: `${url}#main:pkgs/thing`,
    });
  });

  it("leaves a plain ref untouched, with no subdir key", () => {
    const ref = parsePackDeclaration({
      name: "@org/thing",
      source: `${url}#main`,
    });
    expect(ref).toEqual({
      kind: "git",
      pkg: "@org/thing",
      url: "https://github.com/org/repo.git",
      ref: "main",
      source: `${url}#main`,
    });
    expect("subdir" in ref).toBe(false);
  });

  it("splits on the FIRST colon, so a nested path survives", () => {
    // The ref cannot contain a colon; the subdirectory can contain slashes.
    expect(
      parsePackDeclaration({ name: "@org/t", source: `${url}#v1.2:a/b/c` }),
    ).toMatchObject({ ref: "v1.2", subdir: "a/b/c" });
  });

  it("rejects an empty subdirectory rather than silently ignoring it", () => {
    expect(() =>
      parsePackDeclaration({ name: "@org/thing", source: `${url}#main:` }),
    ).toThrow(/subdirectory after : is empty/);
  });
});
