import { describe, expect, it } from "vitest";
import createMemoryLocation from "./createMemoryLocation.js";

describe("createMemoryLocation", () => {
  it("reads the initial query as a fresh URLSearchParams", () => {
    const location = createMemoryLocation({
      href: "/machines?status=failed&status=cancelled",
    });
    const params = location.read();
    expect(params.getAll("status")).toEqual(["failed", "cancelled"]);
  });

  it("preserves repeated parameters through write and read", () => {
    const location = createMemoryLocation({ href: "/machines" });
    const next = new URLSearchParams();
    next.append("status", "failed");
    next.append("status", "cancelled");
    next.append("sort", "updated__desc");
    location.write(next);
    expect(location.read().getAll("status")).toEqual(["failed", "cancelled"]);
    expect(location.read().get("sort")).toBe("updated__desc");
  });

  it("hands out fresh snapshots that do not alias internal state", () => {
    const location = createMemoryLocation({
      href: "/machines?status=failed",
    });
    const first = location.read();
    first.set("status", "cancelled");
    expect(location.read().getAll("status")).toEqual(["failed"]);
  });

  it("notifies subscribers on write and stops after unsubscribe", () => {
    const location = createMemoryLocation();
    let notifications = 0;
    const unsubscribe = location.subscribe(() => {
      notifications += 1;
    });
    location.write(new URLSearchParams("status=failed"));
    expect(notifications).toBe(1);
    unsubscribe();
    location.write(new URLSearchParams("status=cancelled"));
    expect(notifications).toBe(1);
  });

  it("writes the query on a path-and-hash-carrying location", () => {
    const location = createMemoryLocation({
      href: "/machines?status=failed#list",
    });
    location.write(new URLSearchParams("status=cancelled"));
    expect(location.read().get("status")).toBe("cancelled");
    expect(location.read().getAll("status")).toEqual(["cancelled"]);
  });

  it("propagates a throwing listener to the writer", () => {
    const location = createMemoryLocation();
    location.subscribe(() => {
      throw new Error("listener exploded");
    });
    expect(() => location.write(new URLSearchParams("status=failed"))).toThrow(
      "listener exploded",
    );
    expect(location.read().get("status")).toBe("failed");
  });

  it("supports empty query writes", () => {
    const location = createMemoryLocation({ href: "/machines?q=yak" });
    location.write(new URLSearchParams());
    expect(location.read().toString()).toBe("");
  });
});
