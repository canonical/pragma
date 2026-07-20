import { describe, expect, it } from "vitest";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import createGeneratorStamp from "./createGeneratorStamp.js";

const gen = (meta: Record<string, unknown>): GeneratorDefinition =>
  ({
    meta,
    prompts: [],
    generate: () => ({}),
  }) as unknown as GeneratorDefinition;

describe("createGeneratorStamp", () => {
  it("prefers the display name — summon's historical stamp identity", () => {
    expect(
      createGeneratorStamp(
        gen({
          name: "component/react",
          displayName: "React Component",
          version: "1.2.3",
        }),
      ),
    ).toEqual({ generator: "React Component", version: "1.2.3" });
  });

  it("falls back to the registry name without a display name", () => {
    expect(
      createGeneratorStamp(gen({ name: "component/react", version: "1.2.3" })),
    ).toEqual({ generator: "component/react", version: "1.2.3" });
  });
});
