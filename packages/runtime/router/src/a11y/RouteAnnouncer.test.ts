import { describe, expect, it } from "vitest";
import RouteAnnouncer from "./RouteAnnouncer.js";

function createDocument(withBody = true) {
  type AnnouncerNode = {
    readonly attributes: Record<string, string>;
    textContent: string;
    setAttribute(name: string, value: string): void;
  };
  const appended: AnnouncerNode[] = [];

  return {
    appended,
    body: withBody
      ? {
          appendChild(element: AnnouncerNode) {
            appended.push(element);
          },
        }
      : undefined,
    createElement() {
      const attributes: Record<string, string> = {};

      return {
        attributes,
        textContent: "",
        setAttribute(name: string, value: string) {
          attributes[name] = value;
        },
      };
    },
  };
}

describe("RouteAnnouncer", () => {
  it("creates a polite live region and announces messages", async () => {
    const documentLike = createDocument();
    const announcer = new RouteAnnouncer(documentLike);

    await announcer.announce("Users page");
    await announcer.announce("Users page loaded");

    expect(documentLike.appended).toHaveLength(1);
    expect(documentLike.appended[0]?.attributes["aria-live"]).toBe("polite");
    expect(documentLike.appended[0]?.attributes.role).toBe("status");
    expect(documentLike.appended[0]?.textContent).toBe("Users page loaded");
  });

  it("clears the live region when given an empty message", async () => {
    const documentLike = createDocument();
    const announcer = new RouteAnnouncer(documentLike);

    await announcer.announce("Users page");
    await announcer.announce("");

    expect(documentLike.appended[0]?.textContent).toBe("");
  });

  it("is a no-op when no body element is available", async () => {
    const documentLike = createDocument(false);
    const announcer = new RouteAnnouncer(documentLike);

    await expect(announcer.announce("Users page")).resolves.toBeUndefined();
    expect(documentLike.appended).toHaveLength(0);
  });
});
