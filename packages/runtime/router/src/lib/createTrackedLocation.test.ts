import { describe, expect, it } from "vitest";
import createTrackedLocation from "./createTrackedLocation.js";

describe("createTrackedLocation", () => {
  it("records accessed keys and forwards values", () => {
    const accessed: string[] = [];
    const trackedLocation = createTrackedLocation(
      {
        hash: "#details",
        href: "/users/42?page=2#details",
        pathname: "/users/42",
        searchParams: new URLSearchParams("page=2"),
        status: 200,
        url: new URL("https://example.com/users/42?page=2#details"),
      },
      (key) => {
        accessed.push(key);
      },
    );

    expect(trackedLocation.pathname).toBe("/users/42");
    expect(trackedLocation.status).toBe(200);
    expect(trackedLocation.searchParams.get("page")).toBe("2");
    expect(accessed).toEqual(["pathname", "status", "searchParams"]);
  });

  it("defines enumerable getters for every location key", () => {
    const trackedLocation = createTrackedLocation(
      {
        hash: "",
        href: "/",
        pathname: "/",
        searchParams: new URLSearchParams(),
        status: 404,
        url: new URL("https://example.com/"),
      },
      () => {},
    );

    expect(Object.keys(trackedLocation)).toEqual([
      "hash",
      "href",
      "pathname",
      "searchParams",
      "status",
      "url",
    ]);
  });
});
