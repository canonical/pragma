import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import type { CapabilityModule } from "../spec/types.js";
import { emitScripts } from "./emitScripts.js";

const scripts = emitScripts([completionFixture]);

describe("emitScripts — snapshots (fixture model)", () => {
  it("renders the bash script", () => {
    expect(scripts.bash).toMatchSnapshot();
  });

  it("renders the zsh script", () => {
    expect(scripts.zsh).toMatchSnapshot();
  });

  it("renders the fish script", () => {
    expect(scripts.fish).toMatchSnapshot();
  });
});

describe("emitScripts — static tier contract", () => {
  it("inlines enum values in every shell (zero exec for structure)", () => {
    for (const shell of ["bash", "zsh", "fish"] as const) {
      expect(scripts[shell]).toContain("anatomy full summary");
      expect(scripts[shell]).toContain("community core");
    }
  });

  it("delegates only entity contexts to __complete", () => {
    expect(scripts.bash).toContain(
      'mapfile -t COMPREPLY < <("pragma2" __complete --',
    );
    expect(scripts.zsh).toContain("${(f)$(pragma2 __complete --");
    expect(scripts.fish).toContain(
      '-a "(pragma2 __complete -- (__pragma2_words) 2>/dev/null)"',
    );
  });

  it("completes files natively, never through the resolver", () => {
    expect(scripts.bash).toContain('compgen -f -- "$cur"');
    expect(scripts.zsh).toContain("_files");
    expect(scripts.fish).toContain("-l out -rF");
  });

  it("offers mutation flags for mutating verbs", () => {
    expect(scripts.bash).toContain("--dry-run --undo --yes");
    expect(scripts.zsh).toContain("--dry-run --undo --yes");
    expect(scripts.fish).toContain("-l dry-run");
  });

  it("offers --version at the root only", () => {
    const bashRoot = scripts.bash
      .split("\n")
      .filter((line) => line.includes("--version"));
    expect(bashRoot.length).toBe(1);
    expect(scripts.fish).toContain(`-n "__pragma2_at ''" -l version`);
  });

  it("hidden verbs never reach a script", () => {
    for (const shell of ["bash", "zsh", "fish"] as const) {
      expect(scripts[shell]).not.toContain("probe");
    }
  });

  it("documents the shell floors in the headers", () => {
    expect(scripts.bash).toContain("bash >= 4");
    expect(scripts.zsh).toContain("zsh >= 5");
    expect(scripts.fish).toContain("fish >= 3");
  });
});

describe("emitScripts — binName parameterization (PR8 seam)", () => {
  it("defaults to pragma2", () => {
    expect(scripts.bash).toContain("complete -F _pragma2 pragma2");
    expect(scripts.zsh.startsWith("#compdef pragma2")).toBe(true);
  });

  it("targets a custom bin everywhere", () => {
    const renamed = emitScripts([completionFixture], { binName: "pragma9" });
    for (const shell of ["bash", "zsh", "fish"] as const) {
      expect(renamed[shell]).not.toContain("pragma2");
      expect(renamed[shell]).toContain("pragma9");
    }
    expect(renamed.bash).toContain("complete -F _pragma9 pragma9");
    expect(renamed.fish).toContain("__pragma9_at");
  });

  it("throws on a bin name outside the allowlist", () => {
    expect(() =>
      emitScripts([completionFixture], { binName: "bad name" }),
    ).toThrow(/unsafe token/);
    expect(() =>
      emitScripts([completionFixture], { binName: "x$(y)" }),
    ).toThrow(/unsafe token/);
  });
});

describe("emitScripts — live capabilities", () => {
  const live = emitScripts(capabilities);

  it("emits the live nouns and verbs", () => {
    for (const shell of ["bash", "zsh", "fish"] as const) {
      expect(live[shell]).toContain("config");
      expect(live[shell]).toContain("info");
      expect(live[shell]).toContain("show");
      expect(live[shell]).toContain("mcp");
    }
  });
});

describe("emitScripts — adversarial emit-time throw (PROTECTED)", () => {
  it("refuses to emit any script for a hostile grammar", () => {
    const hostile = {
      name: "hostile",
      verbs: [
        {
          path: ["block", 'x"; rm -rf ~'],
          summary: "x",
          params: [],
          output: {
            formatters: { plain: () => "", llm: () => "", json: () => "" },
          },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: false, reason: "t" },
          },
          run: async () => null,
        },
      ],
    } as unknown as CapabilityModule;
    expect(() => emitScripts([hostile])).toThrow(/unsafe token/);
  });
});
