import { afterEach, beforeEach, describe, expect, it } from "vitest";
import detectShell from "./detectShell.js";

describe("detectShell", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.SHELL;
  });

  afterEach(() => {
    if (original !== undefined) {
      process.env.SHELL = original;
    } else {
      delete process.env.SHELL;
    }
  });

  it("detects zsh from /bin/zsh", () => {
    process.env.SHELL = "/bin/zsh";
    expect(detectShell()).toBe("zsh");
  });

  it("detects zsh from /usr/bin/zsh", () => {
    process.env.SHELL = "/usr/bin/zsh";
    expect(detectShell()).toBe("zsh");
  });

  it("detects bash from /bin/bash", () => {
    process.env.SHELL = "/bin/bash";
    expect(detectShell()).toBe("bash");
  });

  it("detects fish from /usr/bin/fish", () => {
    process.env.SHELL = "/usr/bin/fish";
    expect(detectShell()).toBe("fish");
  });

  it("returns null for unknown shell", () => {
    process.env.SHELL = "/bin/tcsh";
    expect(detectShell()).toBeNull();
  });

  it("returns null when SHELL is unset", () => {
    delete process.env.SHELL;
    expect(detectShell()).toBeNull();
  });
});
