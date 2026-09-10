/**
 * The token-graph nouns through the REAL CLI projector (PROTECTED).
 *
 * The parity suites call `verb.run()` directly, which proves the queries and
 * says nothing about the command line a person actually types. Two of this
 * surface's design decisions live entirely in that layer and are invisible to a
 * `run()` call:
 *
 * - a declared filter reaches the command line as `--<kebab-case>`, so a
 *   camelCase param is the only spelling that produces a readable two-word
 *   flag. `channelOf` has to arrive as `--channel-of` and come back as
 *   `channelOf` in the param bag, and both halves are asserted here because a
 *   mismatch would be a flag the help text advertises and the run body never
 *   receives.
 * - a `--`-prefixed positional CANNOT be typed. That is the whole reason a
 *   variable is published without its leading dashes, and it is a claim about
 *   the parser, not about the story — so it is reproduced against the parser
 *   rather than asserted in a comment.
 *
 * Parsed, never run: a `preAction` hook captures the resolved command and
 * throws before the action, so no runtime boots and no store is needed.
 */

import type { Command } from "commander";
import { describe, expect, it } from "vitest";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { projectCli } from "../testing/helpers/projectCli.js";
import { storyModules } from "./distribution.js";

const modules = ["token", "variable"].map((noun) => {
  const module = storyModules.get(noun);
  if (!module) throw new Error(`pragma.conf.ts declares no "${noun}" story`);
  return module;
});

/** What a parse resolved to, thrown out of the hook before the action runs. */
class Parsed extends Error {
  constructor(
    readonly path: string,
    readonly args: string[],
    readonly opts: Record<string, unknown>,
  ) {
    super(path);
  }
}

/** Parse an argv through the real program, without running the verb. */
async function parse(argv: string[]): Promise<Parsed> {
  const program = projectCli(modules);
  program.exitOverride();
  program.configureOutput({ writeErr: () => {}, writeOut: () => {} });
  for (const noun of program.commands) {
    noun.exitOverride();
    noun.configureOutput({ writeErr: () => {}, writeOut: () => {} });
    for (const verb of noun.commands) {
      verb.exitOverride();
      verb.configureOutput({ writeErr: () => {}, writeOut: () => {} });
    }
  }
  program.hook("preAction", (_root, action) => {
    const parent = action.parent?.name();
    const path =
      parent !== undefined && parent !== "pragma"
        ? `${parent} ${action.name()}`
        : action.name();
    throw new Parsed(path, [...action.args], action.opts());
  });
  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof Parsed) return error;
    throw error;
  }
  throw new Error(`argv did not route to a verb: ${argv.join(" ")}`);
}

/** The registered long flags of one `<noun> <verb>` command. */
function flagsOf(noun: string, verb: string): string[] {
  const program = projectCli(modules);
  const command = program.commands
    .find((c) => c.name() === noun)
    ?.commands.find((c) => c.name() === verb) as Command | undefined;
  if (!command) throw new Error(`no CLI command "${noun} ${verb}"`);
  return command.options
    .map((option) => option.long)
    .filter((long): long is string => long !== undefined);
}

describe("the projected command line (PROTECTED)", () => {
  it("projects every declared verb as a command", () => {
    const program = projectCli(modules);
    const commands = program.commands.flatMap((noun) =>
      noun.commands.map((verb) => `${noun.name()} ${verb.name()}`),
    );
    expect(commands.sort()).toEqual([
      "token consumers",
      "token list",
      "token lookup",
      "token sample",
      "token values",
      "variable chain",
      "variable list",
      "variable lookup",
      "variable sample",
    ]);
    // And the compiled modules agree, so the projector is not inventing or
    // dropping one.
    expect(
      modules.flatMap((m) => m.verbs.map((v) => verbKey(v.path))).sort(),
    ).toEqual(commands.sort());
  });

  it("registers a camelCase filter param in KEBAB form", () => {
    // The one two-word dimension in this surface. `--channelof` would have been
    // the only spelling the old grammar admitted, and it reads as a typo.
    expect(flagsOf("token", "list")).toEqual([
      "--type",
      "--channel-of",
      "--search",
      "--limit",
      "--after",
    ]);
  });

  it("hands the run body back the DECLARED param name", async () => {
    // The other half: the flag is kebab, the param bag key is the declared
    // camelCase name the story filters on. A mismatch here would be a flag the
    // help advertises and the run body never sees.
    //
    // COLLECTED into an array, because a declared filter is repeatable and a
    // repeated filter is a union over its values. One occurrence is therefore a
    // one-element array rather than a bare string, and the run body reads it
    // the same way either way.
    const result = await parse(["token", "list", "--channel-of", "color.text"]);
    expect(result.path).toBe("token list");
    expect(result.opts).toMatchObject({ channelOf: ["color.text"] });
    const twice = await parse([
      "token",
      "list",
      "--channel-of",
      "color.text",
      "--channel-of",
      "color.border",
    ]);
    expect(twice.opts).toMatchObject({
      channelOf: ["color.text", "color.border"],
    });
  });

  it("carries the page pair on every list-shaped verb", () => {
    for (const [noun, verb] of [
      ["token", "list"],
      ["token", "values"],
      ["token", "consumers"],
      ["variable", "list"],
      ["variable", "chain"],
    ] as const) {
      expect(flagsOf(noun, verb), `${noun} ${verb}`).toEqual(
        expect.arrayContaining(["--limit", "--after"]),
      );
    }
  });

  it("gives the two lookups a variadic positional and no page pair", () => {
    for (const noun of ["token", "variable"]) {
      const flags = flagsOf(noun, "lookup");
      expect(flags).not.toContain("--limit");
      const parsed = parse([noun, "lookup", "a", "b"]);
      return parsed.then((result) => {
        expect(result.args).toEqual(["a", "b"]);
      });
    }
  });
});

describe("the names these nouns publish are typable (PROTECTED)", () => {
  it("accepts a DOTTED symbol name as a positional", async () => {
    const parsed = await parse(["token", "lookup", "color.text"]);
    expect(parsed.path).toBe("token lookup");
    expect(parsed.args).toEqual(["color.text"]);
  });

  it("accepts a dash-stripped variable name as a positional", async () => {
    const parsed = await parse(["variable", "lookup", "color-text"]);
    expect(parsed.path).toBe("variable lookup");
    expect(parsed.args).toEqual(["color-text"]);
  });

  it("REFUSES the raw CSS name, which is why the dashes are stripped", async () => {
    // Reproduced against the parser rather than asserted in prose: a
    // `--`-prefixed positional is read as an option, so a noun publishing
    // `--color-text` would name something no caller could pass. This is the
    // measurement the published name is derived from.
    await expect(
      parse(["variable", "lookup", "--color-text"]),
    ).rejects.toMatchObject({
      message: expect.stringContaining("unknown option"),
    });
  });

  it("accepts a dotted position and a dotted style key as flag values", async () => {
    // Both are values rather than positionals, so a dot in them is ordinary —
    // but they are the spellings the stories publish, so they are exercised.
    const values = await parse([
      "token",
      "values",
      "--position",
      "mode.dark",
      "--symbol",
      "color.text",
    ]);
    expect(values.opts).toMatchObject({
      position: ["mode.dark"],
      symbol: ["color.text"],
    });
    const consumers = await parse([
      "token",
      "consumers",
      "--key",
      "appearance.background",
      "--variable",
      "color-text",
    ]);
    expect(consumers.opts).toMatchObject({
      key: ["appearance.background"],
      variable: ["color-text"],
    });
  });
});
