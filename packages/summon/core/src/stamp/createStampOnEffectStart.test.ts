import type { Effect } from "@canonical/task";
import { describe, expect, it, vi } from "vitest";
import applyStamp from "./applyStamp.js";
import createStampOnEffectStart from "./createStampOnEffectStart.js";

const stamp = { generator: "test-gen", version: "1.0.0" };

describe("createStampOnEffectStart", () => {
  it("stamps WriteFile content exactly as applyStamp does", () => {
    const effect: Effect = {
      _tag: "WriteFile",
      path: "src/a.ts",
      content: "export {};\n",
    };

    createStampOnEffectStart(stamp)(effect);

    expect((effect as { content: string }).content).toBe(
      applyStamp("src/a.ts", "export {};\n", stamp),
    );
  });

  it("leaves non-write effects untouched and forwards to next", () => {
    const effect: Effect = { _tag: "MakeDir", path: "src", recursive: true };
    const next = vi.fn();

    createStampOnEffectStart(stamp, next)(effect);

    expect(effect).toEqual({ _tag: "MakeDir", path: "src", recursive: true });
    expect(next).toHaveBeenCalledWith(effect);
  });
});
