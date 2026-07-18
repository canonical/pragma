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
      'mapfile -t COMPREPLY < <("pragma" __complete --',
    );
    expect(scripts.zsh).toContain("${(f)$(pragma __complete --");
    expect(scripts.fish).toContain(
      '-a "(pragma __complete -- (__pragma_words) 2>/dev/null)"',
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
    expect(scripts.fish).toContain(`-n "__pragma_at ''" -l version`);
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

describe("emitScripts — minChars gate + family opt-out", () => {
  it("gates only the name exec, never the inlined enum arms", () => {
    // The gate lives inside the shared _dynamic (bash/zsh) and each fish name
    // rule; enum values stay inlined and complete on bare TAB. (Substrings drop
    // the leading `$` to keep the parameter expansion out of a JS string.)
    expect(scripts.bash).toContain("#cur} -ge 2 ] || return 0");
    expect(scripts.zsh).toContain("#cur} >= 2 )) || return 0");
    expect(scripts.fish).toContain("__pragma_minchars 2");
    expect(scripts.bash).toContain('compgen -W "anatomy full summary"');
    expect(scripts.zsh).toContain("compadd -- anatomy full summary");
  });

  it("bakes a custom minChars and drops the gate at 0", () => {
    expect(emitScripts([completionFixture], { minChars: 3 }).bash).toContain(
      "#cur} -ge 3 ] || return 0",
    );
    const off = emitScripts([completionFixture], { minChars: 0 });
    expect(off.bash).not.toContain("-ge");
    // (`#cur} >=` avoids the `zsh >= 5` shell-floor comment in the header.)
    expect(off.zsh).not.toContain("#cur} >=");
    expect(off.fish).not.toContain("__pragma_minchars");
  });

  it("disabledFamilies drops a noun's name completion (config opt-out)", () => {
    const off = emitScripts([completionFixture], {
      disabledFamilies: ["block"],
    });
    // block's only-positional name verb loses its exec entirely…
    expect(scripts.bash).toContain("block/diff)");
    expect(off.bash).not.toContain("block/diff)");
    expect(off.fish).not.toContain("__pragma_at block diff");
    // …while a non-disabled family (standard) still execs the resolver.
    expect(off.bash).toContain("standard/)");
    expect(off.bash).toContain("_pragma_dynamic");
  });
});

describe("emitScripts — binName parameterization (PR8 seam)", () => {
  it("defaults to pragma", () => {
    expect(scripts.bash).toContain("complete -F _pragma pragma");
    expect(scripts.zsh.startsWith("#compdef pragma")).toBe(true);
  });

  it("targets a custom bin everywhere", () => {
    const renamed = emitScripts([completionFixture], { binName: "widget9" });
    for (const shell of ["bash", "zsh", "fish"] as const) {
      expect(renamed[shell]).not.toContain("pragma");
      expect(renamed[shell]).toContain("widget9");
    }
    expect(renamed.bash).toContain("complete -F _widget9 widget9");
    expect(renamed.fish).toContain("__widget9_at");
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
