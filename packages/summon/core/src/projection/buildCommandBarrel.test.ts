import { pure, task } from "@canonical/task";
import { describe, expect, it, vi } from "vitest";
import type { GeneratorNode } from "../discovery/types.js";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import buildCommandBarrel from "./buildCommandBarrel.js";

const generator: GeneratorDefinition = {
  meta: { name: "g", displayName: "g", description: "g", version: "0" },
  prompts: [],
  generate: () => task(pure(undefined)).unwrap(),
};

function node(
  name: string,
  children: GeneratorNode[] = [],
  indexPath?: string,
): GeneratorNode {
  return {
    name,
    path: `/${name}`,
    ...(indexPath ? { indexPath } : {}),
    children: new Map(children.map((child) => [child.name, child])),
  };
}

describe("buildCommandBarrel", () => {
  const loadGenerator = vi.fn(async (indexPath: string) => {
    if (indexPath === "boom") throw new Error("cannot load");
    return generator;
  });

  it("flattens runnable leaves, namespaces, and nested runnables — parents first", async () => {
    const tree = node("root", [
      node("component", [
        node("react", [], "react-index"),
        node("svelte", [], "svelte-index"),
      ]),
      node("init", [], "init-index"),
      // A runnable that ALSO has children: both the entry and its subtree land.
      node("dual", [node("sub", [], "sub-index")], "dual-index"),
      // Neither runnable nor a namespace: contributes nothing.
      node("empty"),
    ]);

    const entries = await buildCommandBarrel(tree, {
      loadGenerator,
      onLoadError: () => {},
    });

    expect(entries.map((entry) => entry.path.join("/"))).toEqual([
      "component",
      "init",
      "dual",
      "component/react",
      "component/svelte",
      "dual/sub",
    ]);
    expect(entries[0]?.description).toBe("component generators");
    expect(entries[0]?.generator).toBeUndefined();
    expect(entries[1]?.generator).toBe(generator);
  });

  it("routes a load failure to onLoadError and skips the entry", async () => {
    const onLoadError = vi.fn();
    const tree = node("root", [
      node("bad", [], "boom"),
      node("good", [], "ok"),
    ]);
    const entries = await buildCommandBarrel(tree, {
      loadGenerator,
      onLoadError,
    });
    expect(entries.map((entry) => entry.path.join("/"))).toEqual(["good"]);
    expect(onLoadError).toHaveBeenCalledWith("bad", expect.any(Error));
    expect(onLoadError.mock.calls[0]?.[1]?.message).toBe("cannot load");
  });
});
