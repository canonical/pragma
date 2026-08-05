import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "@canonical/ke";
import { describe, expect, it, vi } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { runComplete } from "./complete.js";
import { emitScripts } from "./emitScripts.js";
import { indexCompletionEnv } from "./entitySource.js";
import { buildCompletionModel } from "./model.js";
import { parseWords } from "./parse.js";
import { resolveRequest } from "./resolve.js";

// The store constructor (oxigraph WASM boot). Mocked so an entity `__complete`
// can be proven to resolve names from the index WITHOUT ever booting it — the
// runtime companion to the static import-graph guarantee below.
vi.mock("@canonical/ke", () => ({
  createStore: vi.fn(() => {
    throw new Error("createStore called on the storeless completion path");
  }),
}));

/** Whether a shell of this id is on PATH and runnable. */
function hasShell(id: string): boolean {
  return (
    spawnSync(id, ["-c", "printf ok"], { encoding: "utf-8" }).stdout === "ok"
  );
}

/** `<shell> -n <file>`: does the shell accept this text as a script at all? */
function parses(shell: string, script: string): number | null {
  const dir = mkdtempSync(join(tmpdir(), "pragma-reserved-"));
  const file = join(dir, `script.${shell}`);
  writeFileSync(file, script);
  return spawnSync(shell, ["-n", file], { encoding: "utf-8" }).status;
}

/** A hostile module whose names try to smuggle shell syntax. */
function adversarialModule(path: readonly [string, string?]): CapabilityModule {
  const verb: VerbSpec = {
    path,
    summary: "Adversarial.",
    params: [],
    output: {
      formatters: { plain: () => "", llm: () => "", json: () => "null" },
    },
    capability: {
      needsStore: false,
      mutates: false,
      mcp: { expose: false, reason: "test" },
    },
    run: async () => null,
  };
  return { name: "adversarial", verbs: [verb] };
}

const HOSTILE_NAMES = [
  'x"; rm -rf ~',
  "x$(rm -rf ~)",
  "x`touch /tmp/pwned`",
  "x;y",
  "x y",
  "x\ny",
  "x'y",
  "x|y",
  "x&y",
  "x>y",
  "x*",
];

describe("injection safety (PROTECTED)", () => {
  it("buildCompletionModel throws on every hostile verb name", () => {
    for (const name of HOSTILE_NAMES) {
      expect(() => buildCompletionModel([adversarialModule([name])])).toThrow(
        /unsafe token/,
      );
      expect(() =>
        buildCompletionModel([adversarialModule(["thing", name])]),
      ).toThrow(/unsafe token/);
    }
  });

  it("the resolver drops hostile index-sourced candidates", async () => {
    const model = buildCompletionModel([completionFixture]);
    const request = parseWords(["block", "get", ""], model);
    const hostile = [
      "$(rm -rf ~)",
      "`touch /tmp/pwned`",
      "a b",
      "line\nbreak",
      "semi;colon",
      "quote'name",
      'quote"name',
      "pipe|name",
      "-leading-dash",
      "ok-name",
    ];
    const matches = await resolveRequest(request, model, {
      names: () => hostile,
    });
    expect(matches).toEqual(["ok-name"]);
  });

  it("the runtime allowlist agrees with the emit-time gate", async () => {
    // Anything the emit gate would inline, the runtime gate must pass.
    const model = buildCompletionModel([completionFixture]);
    const request = parseWords(["block", "get", ""], model);
    const legitimate = ["button", "ds:Block", "a.b_c+d@e/f", "0numeric"];
    const matches = await resolveRequest(request, model, {
      names: () => legitimate,
    });
    expect([...matches].sort()).toEqual([...legitimate].sort());
  });

  it("buildCompletionModel and emitScripts throw for the same hostile INJECTION grammar", () => {
    // Same gate on both sides for injection. The two gates are NOT identical
    // overall — see the reserved-word describe below, where emit is strictly
    // stricter — so this case is scoped to what they do share rather than
    // stating an equivalence that no longer holds.
    for (const name of HOSTILE_NAMES) {
      const module = adversarialModule(["thing", name]);
      expect(() => buildCompletionModel([module])).toThrow(/unsafe token/);
      expect(() => emitScripts([module])).toThrow(/unsafe token/);
    }
  });
});

describe("the reserved NOUN is refused at EMIT (PROTECTED)", () => {
  // `SAFE_TOKEN_RE` admits `esac` — an ordinary lowercase word. Inlined at
  // `case`-pattern start it terminates the noun dispatch, so the rest of the
  // script is a syntax error and `_pragma` is never defined: the failure mode is
  // NO COMPLETION AT ALL, silently, from a valid-looking installed file.
  // `fish -n` does not catch it either (fish's script has no `case`). No live
  // noun trips it; the gate exists so none ever can.
  //
  // ONE word, because one word is what measurement supports. All 17 of bash's
  // reserved words were rendered into the live templates as the noun and handed
  // to real bash 5.2.21 and real zsh 5.9: only `esac` is rejected (rc 2 / rc 1),
  // and in a VERB position all 17 parse in both shells. The case below proves
  // the rejection for `esac`; the case after it proves the other direction — the
  // guard does not refuse a word the shells accept.
  it("buildCompletionModel accepts `esac` — the token IS shell-safe", () => {
    expect(() =>
      buildCompletionModel([adversarialModule(["esac", "list"])]),
    ).not.toThrow();
  });

  it("emitScripts refuses it, naming the noun and the reason", () => {
    expect(() => emitScripts([adversarialModule(["esac", "list"])])).toThrow(
      /reserved shell word "esac" in noun "esac"/,
    );
  });

  it("without the gate, bash and zsh REFUSE the emitted script", () => {
    // The non-vacuity that matters: the guard is worth having only if the
    // script it prevents is genuinely broken. Emit the same grammar with the
    // reserved noun renamed away, then substitute the reserved word back into
    // the generated text exactly where the noun appears — which is what emit
    // would have produced — and hand it to the shells.
    //
    // GATED: this box ships bash only, so the zsh half `continue`s here and on
    // today's CI (L.01 §10.5 item 6 — installing zsh and fish in the test job is
    // still open). It was executed against zsh 5.9 provisioned per-session.
    const scripts = emitScripts([adversarialModule(["esacx", "list"])]);
    for (const shell of ["bash", "zsh"] as const) {
      if (!hasShell(shell)) continue;
      const good = scripts[shell];
      expect(parses(shell, good)).toBe(0);
      const broken = good.replaceAll("esacx", "esac");
      expect(parses(shell, broken)).not.toBe(0);
    }
  });

  it("emits, and both shells ACCEPT, the 16 words that are not `esac`", () => {
    // The guard's other edge, and the reason it is one word rather than a
    // category: every other reserved word is a legal noun, so a fork declaring
    // `select`, `time` or `in` as a story noun must not fail `bun run build`.
    // Same gating as above for zsh.
    const others = [
      "case", "coproc", "do", "done", "elif", "else", "fi", "for",
      "function", "if", "in", "select", "then", "time", "until", "while",
    ];
    for (const word of others) {
      const scripts = emitScripts([adversarialModule([word, "list"])]);
      for (const shell of ["bash", "zsh"] as const) {
        if (!hasShell(shell)) continue;
        expect(parses(shell, scripts[shell]), `${shell} rejected ${word}`).toBe(
          0,
        );
      }
    }
  });

  it("a reserved VERB label is emitted and parses in every shell", () => {
    // Measured, not assumed: a verb reaches a script only inside a compound
    // pattern (`thing/done)`), a `compgen -W` word list or a `compadd --` list —
    // never at pattern start. Guarding verb labels would cost a fork 17 words of
    // vocabulary for a hazard that does not exist.
    const scripts = emitScripts([adversarialModule(["thing", "done"])]);
    for (const shell of ["bash", "zsh"] as const) {
      if (!hasShell(shell)) continue;
      expect(parses(shell, scripts[shell])).toBe(0);
    }
  });
});

describe("script safety (PROTECTED)", () => {
  const scripts = emitScripts([completionFixture]);
  const shells = ["bash", "zsh", "fish"] as const;

  /** Script text with comment lines removed (headers may quote backticks). */
  function code(script: string): string {
    return script
      .split("\n")
      .filter((line) => !/^\s*#/.test(line))
      .join("\n");
  }

  it("no script ever evals", () => {
    for (const shell of shells) {
      expect(code(scripts[shell])).not.toMatch(/\beval\b/);
      expect(code(scripts[shell])).not.toContain("`");
    }
  });

  it("every bash compgen -W wordlist is a generator-validated literal", () => {
    const script = scripts.bash;
    const uses = [...script.matchAll(/compgen -W (\S)/g)];
    expect(uses.length).toBeGreaterThan(0);
    // Every -W argument opens as a double-quoted literal…
    for (const use of uses) expect(use[1]).toBe('"');
    // …whose content is inert: no $, backtick, quote, or escape ever appears,
    // so `compgen -W` has nothing to expand (its wordlist IS evaluated).
    for (const [, list] of script.matchAll(/compgen -W "([^"]*)"/g)) {
      expect(list).toMatch(/^[A-Za-z0-9@/:._+ -]*$/);
    }
  });

  it("bash ingests dynamic candidates via mapfile, never word-splitting", () => {
    expect(scripts.bash).toContain("mapfile -t COMPREPLY < <(");
  });

  it("zsh always guards compadd with -- and splits on newlines only", () => {
    const compadds = [...code(scripts.zsh).matchAll(/compadd (\S+)/g)];
    expect(compadds.length).toBeGreaterThan(0);
    for (const use of compadds) expect(use[1]).toBe("--");
    expect(scripts.zsh).toContain('"${(f)$(');
  });

  it("fish command substitutions are exactly the __complete delegation", () => {
    const substitutions = [
      ...code(scripts.fish).matchAll(/-a "\(([^)]*)/g),
    ].map((use) => use[1]);
    expect(substitutions.length).toBeGreaterThan(0);
    for (const substitution of substitutions) {
      expect(substitution).toMatch(/^pragma __complete -- /);
    }
  });

  it("every inlined fish/zsh value list is inert", () => {
    for (const [, list] of code(scripts.fish).matchAll(/-a "([^"(][^"]*)"/g)) {
      expect(list).toMatch(/^[A-Za-z0-9@/:._+ -]*$/);
    }
    for (const [, list] of code(scripts.zsh).matchAll(
      /compadd -- ([^\n"]+)$/gm,
    )) {
      const words = list.split(";")[0] ?? "";
      expect(words.trimEnd()).toMatch(/^[A-Za-z0-9@/:._+ -]*$/);
    }
  });
});

/**
 * Walk the *static* import graph from an entry file, following relative
 * `from "./x.js"` and bare `import "./x.js"` specifiers (mapping `.js` back
 * to `.ts`). Dynamic `import()` calls are not followed — that is exactly the
 * lazy boundary the storeless invariant relies on. Mirrors the module-graph
 * probe in `capabilities/lazy.test.ts`.
 */
function staticImportGraph(
  entry: string,
  seen = new Set<string>(),
): Set<string> {
  if (seen.has(entry) || !existsSync(entry)) return seen;
  seen.add(entry);
  const source = readFileSync(entry, "utf-8");
  const fromRe = /\bfrom\s*["']([^"']+)["']/g;
  const bareRe = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  for (const match of [
    ...source.matchAll(fromRe),
    ...source.matchAll(bareRe),
  ]) {
    const spec = match[1];
    if (!spec?.startsWith(".")) continue;
    staticImportGraph(
      resolve(dirname(entry), spec.replace(/\.js$/, ".ts")),
      seen,
    );
  }
  return seen;
}

const here = dirname(fileURLToPath(import.meta.url));
/** The package root, so a failure names `src/…` instead of an absolute path. */
const pkgRoot = resolve(here, "../../..");
const has = (graph: Set<string>, fragment: string): boolean =>
  [...graph].some((file) => file.includes(fragment));

describe("storeless guarantee (PROTECTED)", () => {
  const entries = [
    resolve(here, "index.ts"),
    resolve(here, "complete.ts"),
    resolve(here, "emitScripts.ts"),
    resolve(here, "../../capabilities/meta/complete.verb.ts"),
  ];

  it("the completion import graph never reaches boot, config, store, or zod", () => {
    for (const entry of entries) {
      const graph = staticImportGraph(entry);
      // Runtime boot (bootRuntime) — never on the completion path.
      expect(has(graph, "kernel/runtime/boot.ts")).toBe(false);
      // The config LAYER (reader, evaluator, paths, schema) — storeless means
      // no read. Its tolerated seams are POSITIVE-LISTED, not filtered out by a
      // path fragment: the distribution config sits at the package root, so a
      // `kernel/config/`-shaped filter would not see it and this guard would
      // keep passing after it stopped being true.
      //  - `kernel/config/types.ts` — the ConfigLayers type, imported type-only
      //    via VerbSpec.run's PragmaRuntime and erased at runtime, as
      //    spec/types.ts and runtime/types.ts already are in this graph.
      //  - `pragma.conf.ts` — the distribution config, statically imported by
      //    `constants.ts` (identity), `render/prefixes.ts` (the domain
      //    namespaces) and `kernel/vocabulary.ts` (the domain terms). Safe only
      //    while it stays inert data; `capabilities/lazy.test.ts` pins that.
      const configModules = [...graph]
        .filter((file) => /config|\.conf\./.test(file))
        .map((file) => relative(pkgRoot, file))
        .sort();
      expect(configModules).toEqual([
        "pragma.conf.ts",
        "src/kernel/config/types.ts",
      ]);
      // zod stays off the fast path (validate.ts is the registration seam).
      expect(has(graph, "kernel/spec/validate.ts")).toBe(false);
      // No store/graph modules, present or future.
      expect(has(graph, "store")).toBe(false);
      expect(has(graph, "oxigraph")).toBe(false);
    }
  });

  it("the model derivation is reachable from the grammar alone", () => {
    const graph = staticImportGraph(resolve(here, "model.ts"));
    expect(has(graph, "kernel/spec/emitSurface.ts")).toBe(true);
    expect(has(graph, "kernel/spec/types.ts")).toBe(true);
  });

  it("an entity __complete resolves from the index, never constructs the store", async () => {
    // The wired env (bin + verb) reads the active pack's index off disk; this
    // proves the runtime never boots oxigraph for an entity completion.
    const lookupModule: CapabilityModule = {
      name: "store-spy-fixture",
      verbs: [
        {
          path: ["block", "lookup"],
          summary: "Look up a block.",
          params: [
            {
              kind: "string",
              name: "name",
              doc: "The block name.",
              positional: true,
              required: true,
              complete: {
                kind: "names",
                source: { from: "index", type: "ds:Component" },
              },
            },
          ],
          output: {
            formatters: {
              plain: String,
              llm: String,
              json: (value) => JSON.stringify(value),
            },
          },
          capability: {
            needsStore: true,
            mutates: false,
            mcp: { expose: false, reason: "test" },
          },
          run: async () => ({}),
        } as VerbSpec,
      ],
    };
    // Fresh cwd → no pointer → the reader falls back to the embedded index.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-storespy-"));
    const matches = await runComplete(
      ["block", "lookup", "ds:global.component.but"],
      [lookupModule],
      indexCompletionEnv(cwd),
    );
    // It DID read the index (a real name came back)…
    expect(matches).toContain("ds:global.component.button");
    // …and it did so without ever constructing the store.
    expect(vi.mocked(createStore)).not.toHaveBeenCalled();
  });

  it("every declared name source resolves without constructing the store", async () => {
    // skills (filesystem), prefixes (index ∪ default map) and the index's own
    // `label`/`altNames` fields — every family completes storelessly against
    // the live capabilities. A fresh cwd → no pointer → the embedded index.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-storeless-src-"));
    const env = indexCompletionEnv(cwd);

    // prefixes: `ds` is in the default display map, so it comes back for `d`.
    await expect(
      runComplete(["ontology", "show", "d"], capabilities, env),
    ).resolves.toContain("ds");

    // index + `field: "altNames"`: a real alt name of a real tier comes back
    // from the embedded index. `Apps/Juju` is carried ONLY by the declared
    // alt-name property — it is neither an entity name nor a label — so this
    // fails if the field ever stops being read.
    await expect(
      runComplete(["tier", "lookup", "ap"], capabilities, env),
    ).resolves.toContain("Apps/Juju");

    // skills (no skills root here) and prompt labels (this graph carries no
    // prompt entities) have nothing to offer, and the honest storeless answer
    // is an empty list rather than a store boot.
    for (const words of [
      ["skill", "lookup", "do"],
      ["prompt", "lookup", "bu"],
    ]) {
      await expect(runComplete(words, capabilities, env)).resolves.toEqual([]);
    }

    expect(vi.mocked(createStore)).not.toHaveBeenCalled();
  });

  it("the spawned __complete fast path answers without touching any state", () => {
    // The perf globalSetup guarantees dist/pragma exists.
    // A FRESH INSTALL, reproduced: nothing is inherited from this process's
    // environment, the cwd holds no config, and $HOME plus all three XDG roots
    // are empty temps. Anything the binary answers here it answered from
    // itself. (The suite before this inherited `...process.env`, so it could
    // not tell a compiled-in answer from an ambient one.)
    const binary = fileURLToPath(
      new URL("../../../dist/pragma", import.meta.url),
    );
    const home = mkdtempSync(join(tmpdir(), "pragma-storeless-home-"));
    const xdgConfig = mkdtempSync(join(tmpdir(), "pragma-storeless-cfg-"));
    const xdgState = mkdtempSync(join(tmpdir(), "pragma-storeless-state-"));
    const xdgCache = mkdtempSync(join(tmpdir(), "pragma-storeless-cache-"));
    const emptyCwd = mkdtempSync(join(tmpdir(), "pragma-storeless-cwd-"));
    const env = {
      HOME: home,
      XDG_CONFIG_HOME: xdgConfig,
      XDG_STATE_HOME: xdgState,
      XDG_CACHE_HOME: xdgCache,
    };

    const nouns = spawnSync(binary, ["__complete", "--", "co"], {
      encoding: "utf-8",
      cwd: emptyCwd,
      env,
    });
    expect(nouns.status).toBe(0);
    expect(nouns.stdout).toBe("colophon\nconfig\n");
    expect(nouns.stderr).toBe("");

    // The headline guarantee of the embedded pack: a user who has installed
    // the binary and nothing else gets ENTITY candidates on the first TAB.
    // Every other pin on the embedded index runs in-process, where a bundler
    // change that made `pack.index.generated.ts` unreachable FROM THE BINARY
    // would leave the whole suite green.
    const entities = spawnSync(
      binary,
      ["__complete", "--", "block", "lookup", "ds:global.component.but"],
      { encoding: "utf-8", cwd: emptyCwd, env },
    );
    expect(entities.status).toBe(0);
    expect(entities.stderr).toBe("");
    expect(entities.stdout.split("\n").at(0)).toBe(
      "ds:global.component.button",
    );

    // Storeless and config-free: no first-run marker, no config cache, no
    // store artifacts — the fast path must leave the environment untouched,
    // after BOTH kinds of context.
    expect(readdirSync(home)).toEqual([]);
    expect(readdirSync(xdgConfig)).toEqual([]);
    expect(readdirSync(xdgState)).toEqual([]);
    expect(readdirSync(xdgCache)).toEqual([]);
    expect(readdirSync(emptyCwd)).toEqual([]);
  });

  it("the spawned fast path emits zero bytes for zero candidates, exit 0", () => {
    const binary = fileURLToPath(
      new URL("../../../dist/pragma", import.meta.url),
    );
    const result = spawnSync(binary, ["__complete", "--", "bogus", ""], {
      encoding: "utf-8",
      env: {
        ...process.env,
        XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "pragma-zb-cfg-")),
        XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma-zb-state-")),
      },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});
