/**
 * Every recovery the surface offers must be CALLABLE as written.
 *
 * The error envelope's `recovery.mcp` names the tool an agent invokes to
 * recover (an agent cannot run a shell command). A payload that names a tool
 * the server does not expose, or omits a param that tool requires, is worse
 * than no recovery at all: calling it as written returns `-32602 Invalid
 * arguments`, which reads as if the recovery itself lied. Two such payloads
 * shipped because nothing anywhere executed a recovery against the tool it
 * names — this sweep closes that gap, from both sides:
 *
 * - **Rule 1 (callable):** every `mcp` block's `tool` must name an
 *   MCP-exposed verb, and its `params` (absent ≡ `{}`) must satisfy that
 *   verb's schema — the SAME zod schema `registerVerb` builds for the SDK, so
 *   the sweep and the server cannot disagree about what "valid" means.
 * - **Rule 2 (offered ⇒ callable):** a recovery whose `cli` command names an
 *   MCP-exposed verb must ALSO carry an `mcp` block. The cli string and the
 *   mcp block are one instruction on two surfaces; offering the human half
 *   while withholding the agent half strands the agent mid-recovery.
 *
 * Like `kernel/copy.test.ts`, this reads RAW SOURCE rather than runtime
 * values: recoveries are constructed inside error paths, and triggering every
 * one at runtime would couple the sweep to each path's failure preconditions.
 * The scan covers every `cliRecovery(...)` call site — the single authoring
 * route for a recovery that carries a runnable command (D5) — under
 * `src/kernel/**` and `src/capabilities/**`. Raw `recovery: {...}` literals
 * carry prose only (no `cli`, no `mcp`) and are out of scope by construction;
 * a `tool:` key appearing outside a `cliRecovery` call would be a new
 * authoring route this sweep cannot see, so a final guard pins that none
 * exists.
 *
 * Dynamic pieces are handled, not skipped: the one template shape in the tree
 * (`${noun} list` / `${noun}_list`) is instantiated over every declared story
 * noun, and a dynamic param VALUE (`params: { uri: entityUri }`) validates
 * with a placeholder typed from the param's spec — the sweep checks the
 * ARGUMENT BAG's shape, which is what the SDK validates before the value
 * matters.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildZodSchema } from "../kernel/project/mcp/registerVerb.js";
import type { ParamSpec, VerbSpec } from "../kernel/spec/index.js";
import { toolName } from "../kernel/spec/index.js";
import { declaredStories } from "./distribution.js";
import { capabilities } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/** Params the MCP layer injects on every tool — legal in a recovery's bag. */
const INJECTED_PARAMS = new Set(["cwd", "detail", "confirm"]);

/** Every authored (non-test, non-generated) source under the scanned trees. */
function listSources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listSources(path));
    else if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".generated.ts")
    ) {
      found.push(path);
    }
  }
  return found;
}

const files = [
  ...listSources(join(root, "kernel")),
  ...listSources(join(root, "capabilities")),
  join(root, "bin.ts"),
];

/** One extracted `cliRecovery(...)` call site. */
interface RecoverySite {
  readonly file: string;
  readonly line: number;
  /** The first argument's text (the cli command, without its quotes). */
  readonly command: string;
  /** The third argument's `tool` value text, or undefined when no mcp block. */
  readonly tool: string | undefined;
  /** Parsed `params` keys → literal string value (undefined = dynamic). */
  readonly params: ReadonlyMap<string, string | undefined> | undefined;
  /** Whether a `params:` key was written at all (absent ≡ `{}` for Rule 1). */
  readonly hasMcp: boolean;
}

/**
 * Walk `text` from `start` (just past an opening delimiter) to its balanced
 * close, quote-aware: parens/braces inside string or template literals do not
 * count. Returns the index OF the closing delimiter.
 */
function balancedSpan(
  text: string,
  start: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  let quote: string | undefined;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote !== undefined) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = undefined;
      continue;
    }
    // A comment's text is not code: a `,`/`(`/`)` inside one must not count
    // (several sites annotate the mcp argument with a `// …` rationale).
    if (ch === "/" && text[i + 1] === "/") {
      i = text.indexOf("\n", i);
      if (i === -1) break;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i) + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return i;
  }
  throw new Error(`unbalanced ${open}${close} span at offset ${start}`);
}

/** Split a span at its TOP-LEVEL commas (quote-, bracket- and comment-aware). */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let from = 0;
  let cleaned = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== undefined) {
      cleaned += ch;
      if (ch === "\\") {
        cleaned += text[i + 1] ?? "";
        i++;
      } else if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      const eol = text.indexOf("\n", i);
      i = eol === -1 ? text.length : eol;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i) + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(cleaned.slice(from));
      cleaned += ch;
      from = cleaned.length;
      continue;
    }
    cleaned += ch;
  }
  parts.push(cleaned.slice(from));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** The content of a string/template literal, or undefined for non-literals. */
function literalContent(expr: string): string | undefined {
  const trimmed = expr.trim();
  const first = trimmed[0];
  if (
    (first === '"' || first === "'" || first === "`") &&
    trimmed.endsWith(first) &&
    trimmed.length >= 2
  ) {
    return trimmed.slice(1, -1);
  }
  return undefined;
}

/** Parse an object-literal body's top-level `key: value` entries. */
function objectEntries(body: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const part of splitTopLevel(body)) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const key = part
      .slice(0, colon)
      .trim()
      .replace(/^["']|["']$/g, "");
    entries.set(key, part.slice(colon + 1).trim());
  }
  return entries;
}

/** Extract every cliRecovery call site from one source file. */
function extractSites(file: string): RecoverySite[] {
  const source = readFileSync(file, "utf-8");
  const sites: RecoverySite[] = [];
  const marker = "cliRecovery(";
  let at = source.indexOf(marker);
  while (at !== -1) {
    // Skip the definition itself (`function cliRecovery(`) and re-exports.
    const before = source.slice(Math.max(0, at - 10), at);
    if (!/function\s$/.test(before)) {
      const openAt = at + marker.length;
      const closeAt = balancedSpan(source, openAt, "(", ")");
      const args = splitTopLevel(source.slice(openAt, closeAt));
      const line = source.slice(0, at).split("\n").length;
      const command = literalContent(args[0] ?? "") ?? args[0] ?? "";
      let tool: string | undefined;
      let params: Map<string, string | undefined> | undefined;
      const hasMcp = args.length >= 3;
      if (hasMcp && args[2]?.startsWith("{")) {
        const mcpBody = args[2].slice(1, balancedSpan(args[2], 1, "{", "}"));
        const mcpEntries = objectEntries(mcpBody);
        tool = literalContent(mcpEntries.get("tool") ?? "");
        const paramsExpr = mcpEntries.get("params");
        if (paramsExpr?.startsWith("{")) {
          const paramsBody = paramsExpr.slice(
            1,
            balancedSpan(paramsExpr, 1, "{", "}"),
          );
          params = new Map(
            [...objectEntries(paramsBody)].map(([key, value]) => [
              key,
              literalContent(value),
            ]),
          );
        }
      }
      sites.push({
        file: relative(root, file),
        line,
        command,
        tool,
        params,
        hasMcp,
      });
    }
    at = source.indexOf(marker, at + marker.length);
  }
  return sites;
}

const sites = files.flatMap(extractSites);

// ---------------------------------------------------------------------------
// The tool table: every MCP-exposed verb, its schema built by the SAME
// builder the SDK registration uses.
// ---------------------------------------------------------------------------

const allVerbs: readonly VerbSpec[] = capabilities.flatMap((module) => [
  ...module.verbs,
]);
const exposedByTool = new Map<string, VerbSpec>(
  allVerbs
    .filter((verb) => verb.capability.mcp.expose)
    .map((verb) => [toolName(verb.path), verb]),
);
const verbByKey = new Map<string, VerbSpec>(
  allVerbs.map((verb) => [verb.path.join(" "), verb]),
);
const storyNouns = [...declaredStories.keys()];

/** A placeholder value of the param's declared kind, for dynamic expressions. */
function placeholder(param: ParamSpec): unknown {
  switch (param.kind) {
    case "string":
      return "placeholder";
    case "number":
      return 1;
    case "boolean":
      return true;
    case "enum":
      return param.values[0];
    case "string[]":
      return ["placeholder"];
  }
}

/**
 * Validate one (tool, params) payload against an exposed verb's schema.
 *
 * @returns The failure description, or undefined when the payload is valid.
 */
function callabilityFailure(
  tool: string,
  params: ReadonlyMap<string, string | undefined>,
): string | undefined {
  const verb = exposedByTool.get(tool);
  if (!verb) return `names "${tool}", which is not an exposed MCP tool`;
  const declared = new Map(verb.params.map((param) => [param.name, param]));
  const bag: Record<string, unknown> = {};
  for (const [key, value] of params) {
    if (INJECTED_PARAMS.has(key)) continue;
    const spec = declared.get(key);
    if (!spec) return `passes "${key}", which "${tool}" does not declare`;
    bag[key] = value ?? placeholder(spec);
  }
  const result = z.object(buildZodSchema(verb.params)).safeParse(bag);
  if (!result.success) {
    return `params do not satisfy "${tool}": ${result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ")}`;
  }
  return undefined;
}

/**
 * Resolve a recovery's cli COMMAND to the verb it names, instantiating the
 * `${noun}` template over every declared story noun. Returns one (label,
 * verb-or-undefined) per instantiation; an unresolvable command (flags-only
 * suffix stripped) maps to no verb and is simply not subject to Rule 2.
 */
function commandTargets(
  command: string,
): { label: string; verb: VerbSpec | undefined }[] {
  const [first, second] = command.split(/\s+/);
  if (first === undefined) return [];
  const nouns = first.includes("${") ? storyNouns : [first];
  return nouns.map((noun) => {
    const twoWord =
      second !== undefined && /^[a-z][a-z-]*$/.test(second)
        ? verbByKey.get(`${noun} ${second}`)
        : undefined;
    return {
      label: first.includes("${") ? `${noun} ${second ?? ""}`.trim() : command,
      verb: twoWord ?? verbByKey.get(noun),
    };
  });
}

/** Tool-name instantiations for a site's `tool` text (template-aware). */
function toolInstances(tool: string): { label: string; tool: string }[] {
  if (!tool.includes("${")) return [{ label: tool, tool }];
  return storyNouns.map((noun) => ({
    label: `${tool} (noun=${noun})`,
    tool: tool.replace(/\$\{[^}]+\}/, noun),
  }));
}

describe("recovery sweep — every offered recovery is callable (Rule 1)", () => {
  it("found the call sites (the scan is not silently empty)", () => {
    expect(sites.length).toBeGreaterThanOrEqual(15);
  });

  it.each(sites.filter((site) => site.hasMcp))(
    "$file:$line — mcp payload is a valid call as written",
    (site) => {
      expect(
        site.tool,
        "mcp block present but no literal tool name",
      ).toBeDefined();
      if (site.tool === undefined) return;
      for (const { label, tool } of toolInstances(site.tool)) {
        const failure = callabilityFailure(tool, site.params ?? new Map());
        expect(failure, `${site.file}:${site.line} [${label}]`).toBeUndefined();
      }
    },
  );
});

describe("recovery sweep — a cli command with an exposed twin carries it (Rule 2)", () => {
  // A single sweep rather than an `it.each`: the healthy state of this rule is
  // ZERO sites without an mcp block, and `it.each([])` is a harness error.
  it("no mcp-less recovery quotes a command whose verb is MCP-exposed", () => {
    for (const site of sites.filter((entry) => !entry.hasMcp)) {
      for (const { label, verb } of commandTargets(site.command)) {
        if (verb === undefined) continue;
        expect(
          verb.capability.mcp.expose,
          `${site.file}:${site.line} — cli \`${label}\` names MCP tool ` +
            `"${toolName(verb.path)}" but the recovery carries no mcp block`,
        ).toBe(false);
      }
    }
  });
});

describe("recovery sweep — cliRecovery is the only mcp authoring route", () => {
  it("no `recovery:` object literal carries its own `mcp:` key", () => {
    // A raw `recovery: { …, mcp: {…} }` literal would bypass both rules
    // above. None exists; one appearing should land in cliRecovery instead
    // (or this sweep must learn to read it).
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      let at = source.indexOf("recovery:");
      while (at !== -1) {
        const braceAt = source.indexOf("{", at);
        const viaHelper = source
          .slice(at, braceAt === -1 ? at : braceAt)
          .includes("cliRecovery");
        if (braceAt !== -1 && braceAt - at < 30 && !viaHelper) {
          const body = source.slice(
            braceAt + 1,
            balancedSpan(source, braceAt + 1, "{", "}"),
          );
          expect(
            /(^|[,{\s])mcp\s*:/.test(body),
            `${relative(root, file)} offset ${at}: raw recovery literal ` +
              "carries an mcp block the sweep cannot validate",
          ).toBe(false);
        }
        at = source.indexOf("recovery:", at + 1);
      }
    }
  });
});
