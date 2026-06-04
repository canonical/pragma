import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { getRequestUrl } from "./getRequestUrl.js";

describe("getRequestUrl", () => {
  it("extracts path + query from a Web Request (absolute URL)", () => {
    const request = new Request("https://example.test/a/b?x=1#frag");
    expect(getRequestUrl(request)).toBe("/a/b?x=1");
  });

  it("returns '/' for a Web Request at the root", () => {
    expect(getRequestUrl(new Request("http://localhost/"))).toBe("/");
  });

  it("returns the path as-is from a Node IncomingMessage", () => {
    const req = new IncomingMessage(new Socket());
    req.url = "/a/b?x=1";
    expect(getRequestUrl(req)).toBe("/a/b?x=1");
  });

  it("defaults to '/' when the IncomingMessage has no url", () => {
    const req = new IncomingMessage(new Socket());
    req.url = undefined;
    expect(getRequestUrl(req)).toBe("/");
  });

  it("defaults to '/' when the url is an empty string", () => {
    const req = new IncomingMessage(new Socket());
    req.url = "";
    expect(getRequestUrl(req)).toBe("/");
  });
});
