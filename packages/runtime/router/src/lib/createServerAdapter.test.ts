import { describe, expect, it } from "vitest";
import createServerAdapter from "./createServerAdapter.js";

describe("createServerAdapter", () => {
  it("returns a fixed request location and exposes a no-op subscription", () => {
    const adapter = createServerAdapter("/docs?page=2");
    const unsubscribe = adapter.subscribe(() => {
      throw new Error("server adapter should not publish updates");
    });

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/docs",
      search: "?page=2",
    });
    expect(unsubscribe).toBeTypeOf("function");
    unsubscribe();
  });

  it("accepts URL objects and absolute URL strings", () => {
    const fromUrl = createServerAdapter(new URL("https://example.com/url"));
    const fromAbsoluteString = createServerAdapter(
      "https://example.com/absolute?tab=1",
    );

    expect(fromUrl.getLocation()).toMatchObject({ pathname: "/url" });
    expect(fromAbsoluteString.getLocation()).toMatchObject({
      pathname: "/absolute",
      search: "?tab=1",
    });
  });

  it("rejects client-side navigation attempts", () => {
    const adapter = createServerAdapter("/");

    expect(() => {
      adapter.navigate("/next");
    }).toThrow("Server adapter does not support client-side navigation.");
  });
});
