import { describe, expect, it } from "vitest";
import computeSocketPath from "./computeSocketPath.js";

describe("computeSocketPath", () => {
  it("returns a path starting with the socket prefix", () => {
    const path = computeSocketPath("/home/user/project");
    expect(path).toMatch(/^\/tmp\/pragma-completions-/);
  });

  it("returns a path ending with .sock", () => {
    const path = computeSocketPath("/home/user/project");
    expect(path).toMatch(/\.sock$/);
  });

  it("is deterministic — same cwd produces same path", () => {
    const a = computeSocketPath("/home/user/project");
    const b = computeSocketPath("/home/user/project");
    expect(a).toBe(b);
  });

  it("produces different paths for different cwds", () => {
    const a = computeSocketPath("/home/user/project-a");
    const b = computeSocketPath("/home/user/project-b");
    expect(a).not.toBe(b);
  });
});
