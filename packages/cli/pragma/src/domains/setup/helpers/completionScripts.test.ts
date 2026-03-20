import { describe, expect, it } from "vitest";
import {
  completionScriptContent,
  completionScriptPath,
  postInstallHint,
} from "./completionScripts.js";

describe("completionScriptContent", () => {
  it("produces zsh completion with compdef", () => {
    const script = completionScriptContent("zsh");
    expect(script).toContain("#compdef pragma");
    expect(script).toContain("pragma completions zsh");
  });

  it("produces bash completion with complete -F", () => {
    const script = completionScriptContent("bash");
    expect(script).toContain("complete -F _pragma pragma");
    expect(script).toContain("pragma completions bash");
  });

  it("produces fish completion with complete -c", () => {
    const script = completionScriptContent("fish");
    expect(script).toContain("complete -c pragma");
    expect(script).toContain("pragma completions fish");
  });
});

describe("completionScriptPath", () => {
  it("returns zsh path under ~/.zfunc", () => {
    expect(completionScriptPath("zsh")).toContain(".zfunc/_pragma");
  });

  it("returns bash path under ~/.local/share/bash-completion", () => {
    expect(completionScriptPath("bash")).toContain(
      "bash-completion/completions/pragma",
    );
  });

  it("returns fish path under ~/.config/fish/completions", () => {
    expect(completionScriptPath("fish")).toContain(
      "fish/completions/pragma.fish",
    );
  });
});

describe("postInstallHint", () => {
  it("hints source for zsh", () => {
    expect(postInstallHint("zsh")).toContain("source ~/.zshrc");
  });

  it("hints source for bash", () => {
    expect(postInstallHint("bash")).toContain("source ~/.bashrc");
  });

  it("hints new shell for fish", () => {
    expect(postInstallHint("fish")).toContain("new shell");
  });
});
