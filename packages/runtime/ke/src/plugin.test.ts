import { describe, expect, it } from "vitest";
import { definePlugin } from "./plugin.js";

describe("definePlugin", () => {
  it("returns the plugin as-is", () => {
    const plugin = definePlugin({
      name: "test-plugin",
    });
    expect(plugin.name).toBe("test-plugin");
  });

  it("preserves onQuery hook", () => {
    const onQuery = (sparqlStr: string) => sparqlStr;
    const plugin = definePlugin({
      name: "query-plugin",
      onQuery,
    });
    expect(plugin.onQuery).toBe(onQuery);
  });

  it("preserves onLoad hook", () => {
    const onLoad = () => {};
    const plugin = definePlugin({
      name: "load-plugin",
      onLoad,
    });
    expect(plugin.onLoad).toBe(onLoad);
  });

  it("preserves onResult hook", () => {
    const onResult = () => undefined;
    const plugin = definePlugin({
      name: "result-plugin",
      onResult,
    });
    expect(plugin.onResult).toBe(onResult);
  });
});
