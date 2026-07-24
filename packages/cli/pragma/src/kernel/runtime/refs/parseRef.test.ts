import { describe, expect, it } from "vitest";
import { redactUrl } from "./parseRef.js";

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
