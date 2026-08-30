import chalk from "chalk";
import { afterEach, describe, expect, it } from "vitest";
import { canPrompt, stdoutIsCaptured } from "./interactivity.js";
import { canColor } from "./render/style.js";

/** Force a stream's `isTTY`, as only a test may. */
const setTTY = (
  stream: NodeJS.ReadStream | NodeJS.WriteStream,
  value: boolean | undefined,
): void => {
  (stream as { isTTY?: boolean }).isTTY = value;
};

const savedIn = process.stdin.isTTY;
const savedOut = process.stdout.isTTY;
const savedErr = process.stderr.isTTY;
const savedLevel = chalk.level;
afterEach(() => {
  setTTY(process.stdin, savedIn);
  setTTY(process.stdout, savedOut);
  setTTY(process.stderr, savedErr);
  chalk.level = savedLevel;
});

describe("the interactivity vocabulary asks THREE questions, not one", () => {
  it("a captured stdout with an attended terminal is still promptable", () => {
    // The case that makes flattening these wrong: an agent runs a mutating
    // verb with `| cat` while a terminal is still attached. Answering the
    // prompting question with stdout's probe would refuse a human; answering
    // the output-shape question with stdin's would hand an agent a page of
    // decoration it cannot use.
    setTTY(process.stdout, false);
    setTTY(process.stdin, true);
    setTTY(process.stderr, true);
    expect(stdoutIsCaptured()).toBe(true);
    expect(canPrompt()).toBe(true);
  });

  it("a redirected stderr is NOT promptable, however attended stdout is", () => {
    // `<verb> 2>/dev/null`: the step sequence renders to stderr, so gating on
    // stdout would mount an invisible render that then blocks on stdin.
    setTTY(process.stdout, true);
    setTTY(process.stdin, true);
    setTTY(process.stderr, false);
    expect(stdoutIsCaptured()).toBe(false);
    expect(canPrompt()).toBe(false);
  });

  it("stdin alone does not make a run promptable", () => {
    setTTY(process.stdin, false);
    setTTY(process.stderr, true);
    expect(canPrompt()).toBe(false);
  });

  it("colour needs the terminal AND a usable chalk level", () => {
    setTTY(process.stdout, true);
    chalk.level = 1;
    expect(canColor()).toBe(true);
    // Off in CI-shaped environments where `supports-color` fires off a TTY…
    setTTY(process.stdout, false);
    expect(canColor()).toBe(false);
    // …and off whenever the level is zeroed (what `NO_COLOR` does at load).
    setTTY(process.stdout, true);
    chalk.level = 0;
    expect(canColor()).toBe(false);
  });

  it("treats an absent isTTY as captured / unpromptable, never as attended", () => {
    setTTY(process.stdout, undefined);
    setTTY(process.stdin, undefined);
    setTTY(process.stderr, undefined);
    expect(stdoutIsCaptured()).toBe(true);
    expect(canPrompt()).toBe(false);
    expect(canColor()).toBe(false);
  });
});
