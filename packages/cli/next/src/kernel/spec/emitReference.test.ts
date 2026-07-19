import { describe, expect, it } from "vitest";
import {
  fixtureModule,
  fixtureReferenceModule,
} from "../../testing/fixtures/fixtureCapability.js";
import { ERROR_CODES } from "../error/constants.js";
import { emitReference } from "./emitReference.js";

/** The four pages every reference doc set carries. */
const PAGES = ["index.md", "commands.md", "tools.md", "errors.md"];

describe("emitReference", () => {
  const docs = emitReference([fixtureReferenceModule]);
  const index = docs.get("index.md") ?? "";
  const commands = docs.get("commands.md") ?? "";
  const tools = docs.get("tools.md") ?? "";
  const errors = docs.get("errors.md") ?? "";

  it("emits exactly the four reference pages", () => {
    expect([...docs.keys()].sort()).toEqual([...PAGES].sort());
  });

  it("ends every page in exactly one trailing newline", () => {
    for (const content of docs.values()) {
      expect(content.endsWith("\n")).toBe(true);
      expect(content.endsWith("\n\n")).toBe(false);
    }
  });

  it("is deterministic — the same catalog yields byte-identical pages", () => {
    const again = emitReference([fixtureReferenceModule]);
    for (const page of PAGES) {
      expect(again.get(page)).toBe(docs.get(page));
    }
  });

  describe("index.md", () => {
    it("reports counts derived from the live grammar", () => {
      // gizmo + ping = 2 nouns; local/scan/tidy/wipe/ping = 5 commands (hidden
      // dropped); scan/tidy/wipe/ping = 4 tools (local withheld); 1 resource
      // template (the module's `mcpResources` surface).
      expect(index).toContain("**2** command nouns");
      expect(index).toContain("**5** CLI commands");
      expect(index).toContain("**4** MCP tools");
      expect(index).toContain("**1** resource template(s)");
    });

    it("links the three sibling pages with relative paths", () => {
      expect(index).toContain("(./commands.md)");
      expect(index).toContain("(./tools.md)");
      expect(index).toContain("(./errors.md)");
    });
  });

  describe("commands.md", () => {
    it("groups verbs under noun headings, sorted, hidden excluded", () => {
      expect(commands).toContain("## gizmo");
      expect(commands).toContain("## ping");
      expect(commands.indexOf("## gizmo")).toBeLessThan(
        commands.indexOf("## ping"),
      );
      expect(commands).not.toContain("hidden");
    });

    it("renders a read verb's usage, args, flags, attributes, and examples", () => {
      expect(commands).toContain("### pragma gizmo scan");
      expect(commands).toContain("pragma gizmo scan [targets...] [options]");
      // Optional variadic positional token.
      expect(commands).toContain("| `[targets...]` | no |");
      // Enum flag: escaped pipe token, enum values, and default in the description.
      expect(commands).toContain("| `--mode` | `<fast\\|slow>` |");
      expect(commands).toContain("(one of: fast, slow) (default: fast)");
      // Each flag kind renders its value placeholder.
      expect(commands).toContain("| `--limit` | `<number>` |");
      expect(commands).toContain("| `--label` | `<string>` |");
      expect(commands).toContain("| `--include` | `<value...>` |");
      // A bare boolean switch has no value placeholder.
      expect(commands).toContain("| `--deep` | — |");
      expect(commands).toContain("- Store: storeless.");
      expect(commands).toContain("- MCP: exposed as the `gizmo_scan` tool.");
      // A note becomes a trailing comment; a noteless example stays bare.
      expect(commands).toContain("pragma gizmo scan  # scan everything");
      expect(commands).toContain("pragma gizmo scan alpha --mode slow");
    });

    it("marks a store-backed destructive mutation's CLI attributes", () => {
      expect(commands).toContain("### pragma gizmo wipe");
      expect(commands).toContain("pragma gizmo wipe <path>");
      expect(commands).toContain(
        "- Store: reads the local store (`pragma sources update` builds it).",
      );
      expect(commands).toContain("- Mutation: plan-first");
    });

    it("marks a visible verb withheld from MCP", () => {
      expect(commands).toContain("### pragma gizmo local");
      expect(commands).toContain("- MCP: not exposed (CLI-only).");
    });

    it("renders a self-verb with no sub-command in its invocation", () => {
      expect(commands).toContain("### pragma ping");
      expect(commands).toContain("```\npragma ping\n```");
    });

    it("falls back to the summary when a verb has no doc", () => {
      // `ping` has no `doc`; its summary is the section body.
      const pingSection = commands.slice(commands.indexOf("### pragma ping"));
      expect(pingSection).toContain("Ping the gizmo host.");
    });
  });

  describe("tools.md", () => {
    it("adds the disclosure `detail` param and comma-joined enum types", () => {
      expect(tools).toContain("### gizmo_scan");
      expect(tools).toContain("| `mode` | enum(fast, slow) | no |");
      expect(tools).toContain("| `include` | string[] | no |");
      expect(tools).toContain(
        "| `detail` | enum(summary, detailed) | no | Progressive-disclosure level (default summary). |",
      );
    });

    it("adds confirm + cwd to a mutating tool and flags it destructive", () => {
      const wipe = tools.slice(tools.indexOf("### gizmo_wipe"));
      expect(wipe).toContain("| `confirm` | boolean | no |");
      expect(wipe).toContain("| `cwd` | string | no |");
      expect(tools).toContain(
        "Mutation — plan-first (set `confirm: true` to apply). Marked destructive.",
      );
    });

    it("marks a non-destructive mutating tool as such", () => {
      const tidy = tools.slice(tools.indexOf("### gizmo_tidy"));
      expect(tidy).toContain("| `confirm` | boolean | no |");
      // The `destructive: false` branch of `formatToolAnnotations`.
      expect(tools).toContain(
        "Mutation — plan-first (set `confirm: true` to apply). Non-destructive.",
      );
    });

    it("omits verbs withheld from MCP", () => {
      expect(tools).not.toContain("gizmo_local");
    });

    it("marks a no-param tool as taking no input", () => {
      const ping = tools.slice(tools.indexOf("### ping"));
      expect(ping.slice(0, 200)).toContain("_No input parameters._");
    });

    it("renders every non-tool surface bullet the module declares", () => {
      expect(tools).toContain("## Non-tool surface");
      // The module declares an `mcpResources` template surface (its `surface.
      // templates` id) and an `mcpPrompts` native surface, so all three bullets
      // render — exercising both optional branches of `renderNonToolSurface`.
      expect(tools).toContain("- **Resources**: `gizmo:{+uri}`");
      expect(tools).toContain("- **Prompts**:");
      expect(tools).toContain("- **Instructions**:");
    });
  });

  describe("errors.md", () => {
    it("renders the exit-code table and the full error catalog", () => {
      expect(errors).toContain("| `0` | success |");
      expect(errors).toContain("| `3` | store unavailable |");
      expect(errors).toContain("| `ENTITY_NOT_FOUND` |");
      expect(errors).toContain("| `UNSUPPORTED` |");
    });

    it("lists every code in the closed ERROR_CODES tuple (exhaustive)", () => {
      // Non-circular exhaustiveness: iterate the source-of-truth tuple and
      // assert each code's `catalog` row is present, so a code added to the
      // kernel without a catalog entry fails here (not just the 2 spot-checks).
      for (const code of ERROR_CODES) {
        expect(errors, `errors.md is missing \`${code}\``).toContain(
          `\`${code}\``,
        );
      }
    });

    it("embeds the response envelope as a JSON block", () => {
      expect(errors).toContain("```json");
      expect(errors).toContain('"ok": true');
      expect(errors).toContain('"code": "<ErrorCode>"');
    });
  });
});

describe("emitReference — MCP annotation branches", () => {
  it("renders a destructive fixture tool and a native-prompt-free surface", () => {
    // `fixtureModule.make` is exposed, mutating, and destructive — the same
    // `Marked destructive.` branch, driven from the emitSurface fixture.
    const tools = emitReference([fixtureModule]).get("tools.md") ?? "";
    expect(tools).toContain("### widget_make");
    expect(tools).toContain("Marked destructive.");
    expect(tools).not.toContain("- **Prompts**:");
  });
});
