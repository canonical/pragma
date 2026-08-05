/**
 * `planTask` — reads are real, destruction is simulated.
 *
 * Every assertion here runs against a REAL temp directory, because the whole
 * point of this interpreter is that it observes the filesystem the run would
 * observe. Two cases pin the exact bits the mocking collector gets wrong and
 * that a `--dry-run` therefore lied about:
 *
 * - `readFile` yields the file's REAL bytes, not `[mock content of <path>]`;
 * - `exists` is TRUE for a pre-existing file — `dryRun`'s `mockEffectWithFs`
 *   answers from a virtual set that starts empty, so it says false, and the
 *   read-and-merge branch of a config write was skipped entirely.
 *
 * And the invariant that makes it safe: after a plan containing writes, mkdirs,
 * symlinks and deletes, the tree is byte-identical.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { orElse, parallel, race, sequence_ } from "./combinators.js";
import { dryRun } from "./dry-run.js";
import { raceEffect } from "./effect.js";
import { TaskExecutionError } from "./errors.js";
import { planTask } from "./plan.js";
import {
  appendFile,
  copyDirectory,
  copyFile,
  deleteDirectory,
  deleteFile,
  exec,
  exists,
  getContext,
  glob,
  info,
  mkdir,
  promptText,
  readFile,
  setContext,
  symlink,
  transformFile,
  writeFile,
} from "./primitives.js";
import { $, effect, flatMap, gen, pure } from "./task.js";
import type { Effect } from "./types.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "task-plan-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A stable snapshot of the fixture tree: every path and every file's bytes. */
const snapshot = (root: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (at: string, prefix: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        out[`${rel}/`] = "";
        walk(join(at, entry.name), rel);
      } else if (entry.isSymbolicLink()) {
        out[rel] = "<symlink>";
      } else {
        out[rel] = readFileSync(join(at, entry.name), "utf-8");
      }
    }
  };
  walk(root, "");
  return out;
};

describe("planTask — reads are real", () => {
  it("readFile yields the file's real bytes, where dryRun yields a mock string", async () => {
    const file = join(dir, "real.txt");
    writeFileSync(file, "the actual contents\n");

    const planned = await planTask(readFile(file));
    expect(planned.value).toBe("the actual contents\n");

    // The defect this replaces, pinned so the contrast cannot be lost.
    expect(dryRun(readFile(file)).value).toBe(`[mock content of ${file}]`);
  });

  it("exists is TRUE for a pre-existing file — the bit mockEffectWithFs gets wrong", async () => {
    const file = join(dir, "present.txt");
    writeFileSync(file, "x");

    expect((await planTask(exists(file))).value).toBe(true);
    expect((await planTask(exists(join(dir, "absent.txt")))).value).toBe(false);

    expect(dryRun(exists(file)).value).toBe(false);
  });

  it("exists is TRUE for a path an earlier simulated write would have created", async () => {
    const file = join(dir, "nested", "planned.txt");
    const task = gen(function* () {
      yield* $(writeFile(file, "planned"));
      return yield* $(exists(file));
    });

    expect((await planTask(task)).value).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  it("readFile of a path this plan would have written yields the planned content", async () => {
    const file = join(dir, "planned.txt");
    const task = gen(function* () {
      yield* $(writeFile(file, "planned bytes"));
      return yield* $(readFile(file));
    });

    expect((await planTask(task)).value).toBe("planned bytes");
    expect(existsSync(file)).toBe(false);
  });

  it("glob matches the real tree", async () => {
    writeFileSync(join(dir, "a.md"), "");
    writeFileSync(join(dir, "b.txt"), "");

    const { value } = await planTask(glob("*.md", dir));
    expect(value).toEqual(["a.md"]);
  });

  it("resolves relative effect paths under cwd, as the real run does", async () => {
    writeFileSync(join(dir, "under-cwd.txt"), "found me");

    const { value } = await planTask(readFile("under-cwd.txt"), { cwd: dir });
    expect(value).toBe("found me");
  });

  it("keys the overlay on the RESOLVED path, so cwd-relative and absolute agree", async () => {
    const task = gen(function* () {
      yield* $(writeFile("rel.txt", "body"));
      return yield* $(exists(join(dir, "rel.txt")));
    });

    expect((await planTask(task, { cwd: dir })).value).toBe(true);
  });
});

describe("planTask — a read that fails, fails the plan", () => {
  it("rejects with FILE_NOT_FOUND when the real read is missing", async () => {
    const missing = join(dir, "nope.txt");
    await expect(planTask(readFile(missing))).rejects.toBeInstanceOf(
      TaskExecutionError,
    );
    await planTask(readFile(missing)).catch((error: unknown) => {
      expect((error as TaskExecutionError).code).toBe("FILE_NOT_FOUND");
    });
  });

  it("routes the failed read through the recovery channel, so orElse sees it", async () => {
    const { value } = await planTask(
      orElse(readFile(join(dir, "nope.txt")), pure("fallback")),
    );
    expect(value).toBe("fallback");
  });
});

describe("planTask — destruction is simulated", () => {
  it("leaves the tree byte-identical after writes, mkdir, symlink, copy and deletes", async () => {
    mkdirSync(join(dir, "keep"));
    writeFileSync(join(dir, "keep", "existing.txt"), "untouched\n");
    const before = snapshot(dir);

    const task = sequence_([
      writeFile(join(dir, "new.txt"), "would be written"),
      appendFile(join(dir, "keep", "existing.txt"), "appended", true),
      mkdir(join(dir, "made"), true),
      symlink(join(dir, "keep", "existing.txt"), join(dir, "link.txt")),
      copyFile(join(dir, "keep", "existing.txt"), join(dir, "copy.txt")),
      copyDirectory(join(dir, "keep"), join(dir, "keep-copy")),
      deleteFile(join(dir, "keep", "existing.txt")),
      deleteDirectory(join(dir, "keep")),
    ]);

    await planTask(task);

    expect(snapshot(dir)).toEqual(before);
  });

  it("marks the ANCESTOR directories a write brings into being", async () => {
    // `executeEffect` mkdir -p's the parent before every write, so the run
    // creates directories no leaf path names. Measured before this arm:
    // `writeFile("a/b.txt")` then `exists("a")` answered false to the plan and
    // TRUE to the run — the one divergence direction the residuals list rules
    // out. Both the immediate parent and the grandparent, so the walk is a
    // walk and not one `dirname`.
    const nested = gen(function* () {
      yield* $(writeFile(join(dir, "a", "b", "c.txt"), "x"));
      return [
        yield* $(exists(join(dir, "a", "b"))),
        yield* $(exists(join(dir, "a"))),
      ];
    });
    expect((await planTask(nested)).value).toEqual([true, true]);

    // `mkdir` recursive creates ancestors; non-recursive is `fs.mkdir`'s own
    // contract that the parent already exists, so the run creates none either.
    const recursive = gen(function* () {
      yield* $(mkdir(join(dir, "x", "y"), true));
      return yield* $(exists(join(dir, "x")));
    });
    expect((await planTask(recursive)).value).toBe(true);

    const shallow = gen(function* () {
      yield* $(mkdir(join(dir, "p", "q"), false));
      return yield* $(exists(join(dir, "p")));
    });
    expect((await planTask(shallow)).value).toBe(false);

    // PRESENCE, not content: a marked directory has no readable bytes, so a
    // read of one still fails the way it fails for the run.
    expect(existsSync(join(dir, "a"))).toBe(false);
  });

  it("marks ancestors for the copy destination and the symlink location too", async () => {
    const source = join(dir, "src.txt");
    writeFileSync(source, "bytes");

    const copied = gen(function* () {
      yield* $(copyFile(source, join(dir, "out", "deep", "copy.txt")));
      return yield* $(exists(join(dir, "out")));
    });
    expect((await planTask(copied)).value).toBe(true);

    const linked = gen(function* () {
      yield* $(symlink(source, join(dir, "links", "here.txt")));
      return yield* $(exists(join(dir, "links")));
    });
    expect((await planTask(linked)).value).toBe(true);

    const appended = gen(function* () {
      yield* $(appendFile(join(dir, "logs", "run.txt"), "line", true));
      return yield* $(exists(join(dir, "logs")));
    });
    expect((await planTask(appended)).value).toBe(true);

    expect(readdirSync(dir)).toEqual(["src.txt"]);
  });

  it("does not subtract a simulated delete from what a later exists sees", async () => {
    const file = join(dir, "doomed.txt");
    writeFileSync(file, "x");
    const task = gen(function* () {
      yield* $(deleteFile(file));
      return yield* $(exists(file));
    });

    // Documented residual falsehood: the overlay models additions only.
    expect((await planTask(task)).value).toBe(true);
  });

  it("simulates exec with an empty successful result and runs no process", async () => {
    const marker = join(dir, "ran.txt");
    const { value } = await planTask(
      exec("sh", ["-c", `printf x > ${marker}`]),
    );

    expect(value).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    expect(existsSync(marker)).toBe(false);
  });

  it("simulates log rather than emitting it (the caller renders it as a plan line)", async () => {
    const { effects } = await planTask(info("hello"));
    expect(effects.map((e) => e._tag)).toEqual(["Log"]);
  });

  it("mocks prompts with the same defaults dryRun uses, installing no handler", async () => {
    const { value } = await planTask(
      promptText("name", "Name?", "the-default"),
    );
    expect(value).toBe("the-default");
  });
});

describe("planTask — transformFile", () => {
  it("performs the read half and leaves the file byte-identical", async () => {
    const file = join(dir, "t.txt");
    writeFileSync(file, "original\n");
    let seen: string | undefined;

    await planTask(
      transformFile(file, (source) => {
        seen = source;
        return source.toUpperCase();
      }),
    );

    expect(seen).toBe("original\n");
    expect(readFileSync(file, "utf-8")).toBe("original\n");
  });

  it("fails the plan when the file is missing, exactly as the run fails", async () => {
    await expect(
      planTask(transformFile(join(dir, "gone.txt"), (s) => s)),
    ).rejects.toBeInstanceOf(TaskExecutionError);
  });

  it("fails the plan when the transform throws", async () => {
    const file = join(dir, "t.txt");
    writeFileSync(file, "x");
    await expect(
      planTask(
        transformFile(file, () => {
          throw new Error("bad transform");
        }),
      ),
    ).rejects.toThrow("bad transform");
  });

  it("transforms what this plan would have written when the file is planned, not on disk", async () => {
    const file = join(dir, "planned.txt");
    let seen: string | undefined;
    const task = sequence_([
      writeFile(file, "planned body"),
      transformFile(file, (source) => {
        seen = source;
        return source;
      }),
    ]);

    await planTask(task);
    expect(seen).toBe("planned body");
    expect(existsSync(file)).toBe(false);
  });

  it("a CHAIN of transforms plans the bytes the run produces", async () => {
    // The transformed text used to be computed and thrown away, so each
    // transform re-read the pre-plan file and a later `readFile` answered with
    // it. Measured then: plan `"base"` / transform inputs `["base","base"]`;
    // run `"base|one|two"` / inputs `["base","base|one"]`.
    const file = join(dir, "chain.txt");
    writeFileSync(file, "base");
    const seen: string[] = [];
    const chain = gen(function* () {
      yield* $(
        transformFile(file, (source) => {
          seen.push(source);
          return `${source}|one`;
        }),
      );
      yield* $(
        transformFile(file, (source) => {
          seen.push(source);
          return `${source}|two`;
        }),
      );
      return yield* $(readFile(file));
    });

    const { value } = await planTask(chain);

    expect(seen).toEqual(["base", "base|one"]);
    expect(value).toBe("base|one|two");
    // And the disk is untouched, which is the whole point of planning it.
    expect(readFileSync(file, "utf-8")).toBe("base");
  });
});

describe("planTask — the overlay answers reads of what it planned", () => {
  it("reads back an APPENDED document, where the plan used to throw ENOENT", async () => {
    // `appendFile` recorded presence-without-content, and `sourceOf` could not
    // tell that from absence — so the read fell through to a disk that has no
    // such file and the PLAN failed where the run succeeds.
    const file = join(dir, "appended.txt");
    const task = gen(function* () {
      yield* $(appendFile(file, "hello", true));
      return yield* $(readFile(file));
    });

    expect((await planTask(task)).value).toBe("hello");
    expect(existsSync(file)).toBe(false);
  });

  it("appends onto the REAL bytes when the file is already there", async () => {
    const file = join(dir, "log.txt");
    writeFileSync(file, "one\n");
    const task = gen(function* () {
      yield* $(appendFile(file, "two\n", false));
      yield* $(appendFile(file, "three\n", false));
      return yield* $(readFile(file));
    });

    const { value, effects } = await planTask(task);

    expect(value).toBe("one\ntwo\nthree\n");
    // The base read goes through the un-recorded real interpreter, so the plan's
    // effect SEQUENCE is still the run's — three effects, no extra `ReadFile`.
    expect(effects.map((e) => e._tag)).toEqual([
      "AppendFile",
      "AppendFile",
      "ReadFile",
    ]);
    expect(readFileSync(file, "utf-8")).toBe("one\n");
  });

  it("a COPY destination exists but has no readable bytes — the stated boundary", async () => {
    // Named in the module docblock's residual falsehoods rather than modelled:
    // `CopyDirectory` and `MakeDir` have no single document to carry, so all
    // four presence-only tags behave alike.
    const source = join(dir, "src.txt");
    const dest = join(dir, "dst.txt");
    writeFileSync(source, "SOURCE");

    const seenExists = await planTask(
      gen(function* () {
        yield* $(copyFile(source, dest));
        return yield* $(exists(dest));
      }),
    );
    expect(seenExists.value).toBe(true);

    await expect(
      planTask(
        gen(function* () {
          yield* $(copyFile(source, dest));
          return yield* $(readFile(dest));
        }),
      ),
    ).rejects.toBeInstanceOf(TaskExecutionError);
  });

  it("GLOB does not see the overlay — the other stated boundary", async () => {
    writeFileSync(join(dir, "a.txt"), "a");
    const { value } = await planTask(
      gen(function* () {
        yield* $(writeFile(join(dir, "new.txt"), "hi"));
        return yield* $(glob("*.txt", dir));
      }),
    );

    expect(value).toEqual(["a.txt"]);
  });
});

describe("planTask — context is real", () => {
  it("round-trips writeContext through readContext within one plan", async () => {
    const task = gen(function* () {
      yield* $(setContext("k", 42));
      return yield* $(getContext<number>("k"));
    });

    expect((await planTask(task)).value).toBe(42);
  });

  it("reads a context value the caller seeded", async () => {
    const { value } = await planTask(getContext<string>("seeded"), {
      context: new Map<string, unknown>([["seeded", "yes"]]),
    });
    expect(value).toBe("yes");
  });
});

describe("planTask — effect callbacks and structure", () => {
  it("fires onEffectStart once per effect, in order — the stamp a caller needs", async () => {
    const file = join(dir, "seen.txt");
    writeFileSync(file, "x");
    const started: string[] = [];

    await planTask(
      sequence_([
        exists(file),
        readFile(file),
        writeFile(join(dir, "out.txt"), "y"),
      ]),
      { onEffectStart: (e) => started.push(e._tag) },
    );

    expect(started).toEqual(["Exists", "ReadFile", "WriteFile"]);
  });

  it("the interpreter sees the SHAPED effect — announce, THEN interpret", async () => {
    // `onEffectStart` is documented as a place a caller may REWRITE the effect,
    // and both of pragma's plan branches do exactly that (the generated-by
    // stamp). Nothing in this package held the ordering that makes it work:
    // announcing AFTER `interpretLeaf` left every row here green while the
    // consumer's `--dry-run` under-reported every generated file by 58 bytes.
    // So assert what the OVERLAY recorded, which is what `interpretLeaf`
    // computed, rather than what the callback was handed.
    const target = join(dir, "shaped.txt");
    const { value } = await planTask(
      flatMap(writeFile(target, "body"), () => readFile(target)),
      {
        onEffectStart: (effect) => {
          if (effect._tag === "WriteFile") {
            (effect as { content: string }).content =
              `stamp\n${effect.content}`;
          }
        },
      },
    );

    expect(value).toBe("stamp\nbody");
    // And nothing reached the disk, so the rewrite is the plan's, not a write.
    expect(existsSync(target)).toBe(false);
  });

  it("collects effects in reached order, including structural children", async () => {
    const { effects } = await planTask(
      parallel([
        writeFile(join(dir, "a"), "a"),
        writeFile(join(dir, "b"), "b"),
      ]),
    );

    expect(effects.map((e: Effect) => e._tag)).toEqual([
      "WriteFile",
      "WriteFile",
    ]);
  });

  it("fires the structural callbacks for Parallel and Race", async () => {
    const started: string[] = [];
    await planTask(parallel([pure(1), pure(2)]), {
      onEffectStart: (e) => started.push(e._tag),
    });
    await planTask(race([pure(1)]), {
      onEffectStart: (e) => started.push(e._tag),
    });

    expect(started).toEqual(["Parallel", "Race"]);
  });

  it("describes the FIRST branch of a race and yields its value", async () => {
    const { value, effects } = await planTask(
      race([
        writeFile(join(dir, "first"), "1"),
        writeFile(join(dir, "second"), "2"),
      ]),
    );

    expect(value).toBeUndefined();
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ path: join(dir, "first") });
  });

  it("yields undefined for an empty race", async () => {
    // `race([])` fails at the combinator, so the empty Race effect is only
    // constructible directly — pinned anyway so the planner's zero-child path
    // is not merely unreached code.
    const { value } = await planTask(effect(raceEffect([])));
    expect(value).toBeUndefined();
  });

  it("yields the children's values for a parallel", async () => {
    const { value } = await planTask(parallel([pure(1), pure(2)]));
    expect(value).toEqual([1, 2]);
  });

  it("a failing parallel child does not stop its siblings — runTask's shape", async () => {
    // `runTask` drives every child through `Promise.allSettled`. A `for` loop
    // that rethrew the first child's error made the PLAN reach fewer effects
    // than the RUN performs — the PRA-104 direction, and one no residual in
    // `plan.ts`'s list names. Measured before the fix, against real temp dirs:
    // plan `Parallel,ReadFile` vs run `Parallel,ReadFile,WriteFile`.
    const { effects } = await planTask(
      orElse(
        parallel([
          readFile(join(dir, "absent.txt")),
          writeFile(join(dir, "sibling.txt"), "written"),
        ]),
        pure("recovered"),
      ),
    );

    expect(effects.map((e: Effect) => e._tag)).toEqual([
      "ReadFile",
      "WriteFile",
    ]);
  });

  it("a parallel throws the FIRST error with the rest suppressed", async () => {
    // The second half of the same divergence: `suppressed` was 0 to the plan
    // and 1 to the run for `parallel([readFile(m1), readFile(m2)])`.
    const failure = await planTask(
      parallel([
        readFile(join(dir, "missing-one.txt")),
        readFile(join(dir, "missing-two.txt")),
      ]),
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TaskExecutionError);
    const { taskError } = failure as TaskExecutionError;
    expect(taskError.code).toBe("FILE_NOT_FOUND");
    expect(taskError.message).toContain("missing-one.txt");
    expect(taskError.suppressed).toHaveLength(1);
    expect(taskError.suppressed?.[0]?.message).toContain("missing-two.txt");
  });
});

describe("planTask — interruption", () => {
  it("refuses to start when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      planTask(pure(1), { signal: controller.signal }),
    ).rejects.toThrow("Task interrupted");
  });
});
