import type {
  GeneratorDefinition,
  GeneratorNode,
} from "@canonical/summon-core";
import { generatorCache } from "@canonical/summon-core";
import { pure, task } from "@canonical/task";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  // The real loader path: `cache:` keys resolve through the shared
  // generatorCache (how discovery hands over package-barrel generators),
  // and a missing key throws — the load-failure path, no injection seam.
  generatorCache.set("g", generator);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flattens runnable leaves, namespaces, and nested runnables — parents first", async () => {
    const tree = node("root", [
      node("component", [
        node("react", [], "cache:g"),
        node("svelte", [], "cache:g"),
      ]),
      node("init", [], "cache:g"),
      // A runnable that ALSO has children: both the entry and its subtree land.
      node("dual", [node("sub", [], "cache:g")], "cache:g"),
      // Neither runnable nor a namespace: contributes nothing.
      node("empty"),
    ]);

    const entries = await buildCommandBarrel(tree);

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

  it("warns on a load failure and skips the entry, the rest still land", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const tree = node("root", [
      node("bad", [], "cache:missing"),
      node("good", [], "cache:g"),
    ]);
    const entries = await buildCommandBarrel(tree);
    expect(entries.map((entry) => entry.path.join("/"))).toEqual(["good"]);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Warning: Could not load generator 'bad':"),
      "Generator not found in cache: missing",
    );
  });
});
