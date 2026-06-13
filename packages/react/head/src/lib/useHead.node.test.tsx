// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import useHead from "./useHead.js";

function Probe(): null {
  useHead({
    title: "Title",
    meta: [{ name: "description", content: "Desc" }],
    link: [{ rel: "canonical", href: "https://example.com" }],
  });
  return null;
}

describe("useHead in non-DOM environments", () => {
  it("renders via renderToString without a HeadProvider", () => {
    expect(() => renderToString(<Probe />)).not.toThrow();
  });
});
