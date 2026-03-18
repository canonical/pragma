import { describe, expect, it } from "vitest";
import createInteractiveResult from "./createInteractiveResult.js";
import type { InteractiveSpec } from "./types.js";

describe("createInteractiveResult", () => {
  it("creates a result with tag interactive", () => {
    const spec: InteractiveSpec = {
      generator: {
        meta: { name: "test", version: "1.0.0" },
        prompts: [{ name: "name", message: "Name?", type: "text" }],
        generate: () => ({ _tag: "Pure" as const, value: undefined }),
      },
      partialAnswers: { name: "Button" },
      options: {
        dryRunOnly: false,
        verbose: false,
        stamp: undefined,
        preview: false,
      },
    };

    const result = createInteractiveResult(spec);

    expect(result.tag).toBe("interactive");
    expect(result.spec.partialAnswers).toEqual({ name: "Button" });
    expect(result.spec.options.dryRunOnly).toBe(false);
  });
});
