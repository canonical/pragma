import { afterEach, describe, expect, it, vi } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import {
  completionFixture,
  fixtureNameEnv,
} from "../../testing/fixtures/completionFixture.js";
import type { CapabilityModule } from "../spec/types.js";
import { runComplete } from "./complete.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("runComplete — the __complete pipeline", () => {
  it("resolves against the live capabilities (storeless static matches)", async () => {
    await expect(runComplete(["co"], capabilities)).resolves.toEqual([
      "colophon",
      "config",
    ]);
    // The live `config` sub-verbs, prefix-filtered and sorted by the resolver.
    await expect(runComplete(["config", ""], capabilities)).resolves.toEqual([
      "channel",
      "detail",
      "set",
      "show",
      "tier",
    ]);
    await expect(runComplete(["mc"], capabilities)).resolves.toEqual(["mcp"]);
    await expect(runComplete(["--d"], capabilities)).resolves.toEqual([
      "--detail",
    ]);
  });

  it("hidden verbs never complete", async () => {
    const matches = await runComplete(["__com"], capabilities);
    expect(matches).toEqual([]);
  });

  it("strips a leading bin name", async () => {
    await expect(runComplete(["pragma", "co"], capabilities)).resolves.toEqual([
      "colophon",
      "config",
    ]);
  });

  it("resolves name contexts through the provided env", async () => {
    await expect(
      runComplete(["block", "get", "but"], [completionFixture], fixtureNameEnv),
    ).resolves.toEqual(["button", "button-group"]);
  });

  it("defaults to the empty name source (zero name candidates)", async () => {
    await expect(
      runComplete(["block", "get", "but"], [completionFixture]),
    ).resolves.toEqual([]);
  });
});

describe("runComplete — never-throw guard (PROTECTED)", () => {
  const poisoned = [
    { name: "poisoned", verbs: [{ path: ['x"; rm -rf ~'] }] },
  ] as unknown as CapabilityModule[];

  it("returns zero candidates instead of throwing on a poisoned model", async () => {
    await expect(runComplete([""], poisoned)).resolves.toEqual([]);
  });

  it("stays silent on stderr without the debug flag", async () => {
    vi.stubEnv("PRAGMA_COMPLETE_DEBUG", "");
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await runComplete([""], poisoned);
    await runComplete(["co"], capabilities);
    expect(write).not.toHaveBeenCalled();
  });

  it("reports the error on the debug channel when enabled", async () => {
    vi.stubEnv("PRAGMA_COMPLETE_DEBUG", "1");
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await runComplete([""], poisoned);
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining("[complete] error:"),
    );
  });

  it("logs context, candidate count, and timing under debug", async () => {
    vi.stubEnv("PRAGMA_COMPLETE_DEBUG", "1");
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await runComplete(["co"], capabilities);
    const lines = write.mock.calls.map((call) => String(call[0]));
    expect(lines.join("")).toMatch(
      /\[complete\] context=noun partial="co" candidates=2 in \d+(\.\d+)?ms/,
    );
  });
});
