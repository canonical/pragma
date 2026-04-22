import { afterEach, describe, expect, it, vi } from "vitest";
import createMemoryAdapter from "./createMemoryAdapter.js";
import createRouter from "./createRouter.js";
import route from "./route.js";

async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createTitleDocument(log: string[]) {
  let currentTitle = "";
  let headingText = "Home";
  const outlet = {
    focus: vi.fn<(options?: { preventScroll?: boolean }) => void>(),
    getAttribute() {
      return null;
    },
    scrollIntoView: vi.fn<() => void>(),
    setAttribute: vi.fn<(name: string, value: string) => void>(),
    textContent: headingText,
  };
  const liveRegion = {
    textContent: "",
    setAttribute: vi.fn<(name: string, value: string) => void>(),
  };

  const documentLike = {
    body: {
      appendChild: vi.fn<(child: unknown) => void>(),
    },
    createElement() {
      return liveRegion;
    },
    get headingText() {
      return headingText;
    },
    querySelector(selector: string) {
      if (selector === "h1") {
        return {
          ...outlet,
          textContent: headingText,
        };
      }

      if (selector === "[data-router-outlet]") {
        return outlet;
      }

      if (selector === "#details") {
        return outlet;
      }

      return null;
    },
    setHeadingText(value: string) {
      headingText = value;
    },
    get title() {
      return currentTitle;
    },
    set title(value: string) {
      log.push(`title:${value}`);
      currentTitle = value;
    },
  };

  return { documentLike, liveRegion, outlet };
}

describe("createRouter accessibility", () => {
  const originalDocument = (globalThis as { document?: unknown }).document;
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = originalDocument;
    }

    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("runs provided accessibility managers in the expected order", async () => {
    const log: string[] = [];
    const adapter = createMemoryAdapter("/");
    const scrollManager = {
      restore: vi.fn<
        (location: string | URL, navigationType: "pop" | "push") => void
      >((location, navigationType) => {
        log.push(`scroll:${navigationType}:${String(location)}`);
      }),
      save: vi.fn<(location: string | URL) => void>((location) => {
        log.push(`save:${String(location)}`);
      }),
    };
    const focusManager = {
      focus: vi.fn<() => boolean>(() => {
        log.push("focus");
        return true;
      }),
    };
    const routeAnnouncer = {
      announce: vi.fn<(message: string) => Promise<void>>(async (message) => {
        log.push(`announce:${message}`);
      }),
    };
    const viewTransition = {
      run: vi.fn<(update: () => void | Promise<void>) => Promise<void>>(
        async (update) => {
          log.push("transition:start");
          await update();
          log.push("transition:end");
        },
      ),
    };
    const titleDocument = {
      querySelector() {
        return { textContent: "Users heading" };
      },
      get title() {
        return "";
      },
      set title(value: string) {
        log.push(`title:${value}`);
      },
    };
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      {
        accessibility: {
          document: titleDocument,
          focusManager,
          getTitle(context) {
            return context.location.pathname === "/users" ? "Users" : null;
          },
          routeAnnouncer,
          scrollManager,
          viewTransition,
        },
        adapter,
      },
    );

    await flushEffects();
    log.length = 0;

    router.navigate("users");
    await flushEffects();

    expect(log).toEqual([
      "save:/",
      "transition:start",
      "transition:end",
      "title:Users",
      "scroll:push:/users",
      "focus",
      "announce:Users heading",
    ]);
  });

  it("uses the default accessibility managers when globals are available", async () => {
    const log: string[] = [];
    const adapter = createMemoryAdapter("/");
    const sessionStorage = new Map<string, string>();
    const { documentLike, liveRegion, outlet } = createTitleDocument(log);

    (globalThis as { document?: unknown }).document = documentLike;
    (globalThis as { window?: unknown }).window = {
      pageXOffset: 10,
      pageYOffset: 20,
      scrollTo(position: { left: number; top: number }) {
        log.push(`scrollTo:${position.left}:${position.top}`);
      },
      scrollX: 10,
      scrollY: 20,
      sessionStorage: {
        getItem(key: string) {
          return sessionStorage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          sessionStorage.set(key, value);
        },
      },
    };

    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users#details",
          content: () => "users",
        }),
      },
      { adapter },
    );

    router.subscribe(() => {
      documentLike.setHeadingText(
        router.getState().location.pathname === "/users" ? "Users" : "Home",
      );
    });

    await flushEffects();

    log.length = 0;
    router.navigate("users");

    await flushEffects();

    expect(outlet.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(outlet.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(documentLike.body.appendChild).toHaveBeenCalledTimes(1);
    expect(liveRegion.textContent).toBe("Users");
  });

  it("announces the current document title when one is available", async () => {
    const adapter = createMemoryAdapter("/");
    const liveRegion = {
      textContent: "",
      setAttribute: vi.fn<(name: string, value: string) => void>(),
    };
    const documentLike = {
      body: {
        appendChild: vi.fn<(child: unknown) => void>(),
      },
      createElement() {
        return liveRegion;
      },
      querySelector(selector: string) {
        if (selector === "[data-router-outlet]") {
          return {
            focus: vi.fn<(options?: { preventScroll?: boolean }) => void>(),
            getAttribute() {
              return null;
            },
            setAttribute: vi.fn<(name: string, value: string) => void>(),
          };
        }

        return null;
      },
      title: "Users title",
    };

    (globalThis as { document?: unknown }).document = documentLike;
    (globalThis as { window?: unknown }).window = {
      scrollTo: vi.fn<(position: { left: number; top: number }) => void>(),
      sessionStorage: {
        getItem() {
          return null;
        },
        setItem: vi.fn<(key: string, value: string) => void>(),
      },
    };

    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      { adapter },
    );

    router.navigate("users");
    await flushEffects();

    expect(liveRegion.textContent).toBe("Users title");
  });

  it("falls back to the pathname when no title or heading is available", async () => {
    const adapter = createMemoryAdapter("/");
    const liveRegion = {
      textContent: "",
      setAttribute: vi.fn<(name: string, value: string) => void>(),
    };
    const documentLike = {
      body: {
        appendChild: vi.fn<(child: unknown) => void>(),
      },
      createElement() {
        return liveRegion;
      },
      querySelector() {
        return null;
      },
      title: "",
    };

    (globalThis as { document?: unknown }).document = documentLike;
    (globalThis as { window?: unknown }).window = {
      scrollTo: vi.fn<(position: { left: number; top: number }) => void>(),
      sessionStorage: {
        getItem() {
          return null;
        },
        setItem: vi.fn<(key: string, value: string) => void>(),
      },
    };

    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      { adapter },
    );

    router.navigate("users");
    await flushEffects();

    expect(liveRegion.textContent).toBe("/users");
  });

  it("falls back to top scrolling when a hash target is not scrollable", async () => {
    const adapter = createMemoryAdapter("/");
    const scrollTo = vi.fn<(position: { left: number; top: number }) => void>();
    const documentLike = {
      body: {
        appendChild: vi.fn<(child: unknown) => void>(),
      },
      createElement() {
        return {
          textContent: "",
          setAttribute: vi.fn<(name: string, value: string) => void>(),
        };
      },
      querySelector(selector: string) {
        if (selector === "[data-router-outlet]") {
          return {
            focus: vi.fn<(options?: { preventScroll?: boolean }) => void>(),
            getAttribute() {
              return null;
            },
            setAttribute: vi.fn<(name: string, value: string) => void>(),
          };
        }

        if (selector === "#details") {
          return { textContent: "details" };
        }

        return null;
      },
      title: "",
    };

    (globalThis as { document?: unknown }).document = documentLike;
    (globalThis as { window?: unknown }).window = {
      scrollTo,
      sessionStorage: {
        getItem() {
          return null;
        },
        setItem: vi.fn<(key: string, value: string) => void>(),
      },
    };

    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users#details",
          content: () => "users",
        }),
      },
      { adapter },
    );

    router.navigate("users");
    await flushEffects();

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("creates a default scroll manager even when no document is available", async () => {
    const adapter = createMemoryAdapter("/");
    const scrollTo = vi.fn<(position: { left: number; top: number }) => void>();

    delete (globalThis as { document?: unknown }).document;
    (globalThis as { window?: unknown }).window = {
      scrollTo,
      sessionStorage: {
        getItem() {
          return null;
        },
        setItem: vi.fn<(key: string, value: string) => void>(),
      },
    };

    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      { adapter },
    );

    router.navigate("users");
    await flushEffects();

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("allows accessibility managers to be disabled", async () => {
    const adapter = createMemoryAdapter("/");
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      {
        accessibility: {
          focusManager: false,
          routeAnnouncer: false,
          scrollManager: false,
          viewTransition: false,
        },
        adapter,
      },
    );

    await expect(flushEffects()).resolves.toBeUndefined();
    expect(() => {
      router.navigate("users");
    }).not.toThrow();
  });

  it("restores scroll positions on pop navigation", async () => {
    const adapter = createMemoryAdapter("/");
    const log: string[] = [];
    const scrollManager = {
      restore: vi.fn<
        (location: string | URL, navigationType: "pop" | "push") => void
      >((location, navigationType) => {
        log.push(`restore:${navigationType}:${String(location)}`);
      }),
      save: vi.fn<(location: string | URL) => void>((location) => {
        log.push(`save:${String(location)}`);
      }),
    };
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      {
        accessibility: {
          focusManager: false,
          routeAnnouncer: false,
          scrollManager,
          viewTransition: false,
        },
        adapter,
      },
    );

    await flushEffects();
    log.length = 0;

    router.navigate("users");
    await flushEffects();
    log.length = 0;

    adapter.back();
    await flushEffects();

    expect(log).toEqual(["save:/users", "restore:pop:/"]);
  });

  it("hydrates the initial router state before subscribing to the adapter", () => {
    const adapter = createMemoryAdapter("/ignored");
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        users: route({
          url: "/users",
          content: () => "users",
        }),
      },
      {
        adapter,
        hydratedState: {
          href: "/users",
          kind: "route",
          routeId: "users",
          status: 200,
        },
      },
    );

    expect(router.render()).toBe("users");
  });
});
