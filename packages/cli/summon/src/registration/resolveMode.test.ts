/**
 * The TTY rows of the interaction table, driven through the host seam with
 * `tty: true` — the cells no subprocess test can reach (pipes are never
 * TTYs). §L items 4a/4b live here: TTY `--dry-run` renders the batch plan
 * and TTY `--undo` runs batch undo (the OLD decision block sent both to
 * Ink), and a TTY with partial flags asks the missing prompts. The
 * `summonIsTTY` expression itself (stdin AND STDOUT — the cross-CLI matrix) is
 * pinned against patched streams.
 */

import type { PromptLike } from "@canonical/summon-core/projection";
import { afterEach, describe, expect, it } from "vitest";
import { resolveSummonMode, summonIsTTY } from "./resolveMode.js";

const prompts: readonly PromptLike[] = [
  {
    name: "componentPath",
    type: "text",
    message: "Component path:",
    default: "src/components/MyComponent",
  },
  {
    name: "withStyles",
    type: "confirm",
    message: "Include styles?",
    default: true,
  },
];

const options = (
  dryRun: boolean,
  undo: boolean,
  yes: boolean,
): Record<string, unknown> => ({ dryRun, undo, yes });

describe("resolveSummonMode — the TTY-injected decision seam", () => {
  it("TTY --dry-run is batch-dry-run, never an Ink preview (§L item 4a)", () => {
    expect(
      resolveSummonMode(prompts, options(true, false, false), {}, true),
    ).toBe("batch-dry-run");
  });

  it("TTY --undo is batch-undo, never a prompting App (§L item 4b)", () => {
    expect(
      resolveSummonMode(prompts, options(false, true, false), {}, true),
    ).toBe("batch-undo");
  });

  it("TTY --dry-run outranks --undo (the shared precedence)", () => {
    expect(
      resolveSummonMode(prompts, options(true, true, false), {}, true),
    ).toBe("batch-dry-run");
  });

  it("a TTY with partial flags is a wizard (asks the missing prompts, §L item 5)", () => {
    expect(
      resolveSummonMode(
        prompts,
        options(false, false, false),
        { withStyles: false },
        true,
      ),
    ).toBe("wizard");
  });

  it("the same partial input without a TTY refuses; complete input runs", () => {
    expect(
      resolveSummonMode(
        prompts,
        options(false, false, false),
        { withStyles: false },
        false,
      ),
    ).toBe("refuse");
    expect(
      resolveSummonMode(
        prompts,
        options(false, false, false),
        { componentPath: "src/components/X", withStyles: false },
        false,
      ),
    ).toBe("run");
  });
});

describe("summonIsTTY — stdin AND stdout (the wizard renders to stdout)", () => {
  const setTTY = (
    stream: NodeJS.ReadStream | NodeJS.WriteStream,
    value: boolean | undefined,
  ): void => {
    (stream as { isTTY?: boolean }).isTTY = value;
  };
  const savedIn = process.stdin.isTTY;
  const savedOut = process.stdout.isTTY;
  const savedErr = process.stderr.isTTY;

  afterEach(() => {
    setTTY(process.stdin, savedIn);
    setTTY(process.stdout, savedOut);
    setTTY(process.stderr, savedErr);
  });

  it("requires both streams; stderr is irrelevant (pragma's gate differs, deliberately)", () => {
    const cases: Array<[boolean, boolean, boolean, boolean]> = [
      [true, true, false, true], // stderr is irrelevant…
      [true, true, true, true],
      [false, true, true, false], // …stdin is required…
      [true, false, true, false], // …and so is stdout.
      [false, false, false, false],
    ];
    for (const [stdin, stdout, stderr, expected] of cases) {
      setTTY(process.stdin, stdin);
      setTTY(process.stdout, stdout);
      setTTY(process.stderr, stderr);
      expect(summonIsTTY(), `stdin=${stdin} stdout=${stdout}`).toBe(expected);
    }
  });
});
