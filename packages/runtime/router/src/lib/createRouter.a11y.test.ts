import { afterEach, describe, expect, it, vi } from "vitest";
import createHistoryAdapter from "./createHistoryAdapter.js";
import createMemoryAdapter from "./createMemoryAdapter.js";
import createNavigationAdapter from "./createNavigationAdapter.js";
import createRouter from "./createRouter.js";
import redirect from "./redirect.js";
import route from "./route.js";
import type {
  PlatformAdapter,
  RouterAccessibilityOptions,
  StandardSchemaV1,
} from "./types.js";

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

/**
 * A browser's session history for the fake windows below: the entries the
 * adapter wrote, which of them is current, and every write as
 * `push:<path>` or `replace:<path>`.
 */
function createSessionHistory(initialPath: string) {
  const entries = [new URL(initialPath, "https://example.com")];
  const writes: string[] = [];
  let index = 0;

  return {
    writes,
    get href() {
      return entries[index].href;
    },
    write(url: string | URL, replace: boolean) {
      const nextUrl = new URL(String(url), entries[index]);

      if (replace) {
        entries[index] = nextUrl;
      } else {
        entries.splice(index + 1, entries.length - index - 1, nextUrl);
        index = entries.length - 1;
      }

      writes.push(
        `${replace ? "replace" : "push"}:${nextUrl.pathname}${nextUrl.search}`,
      );
    },
    back() {
      index -= 1;
    },
  };
}

interface AdapterHarness {
  readonly adapter: PlatformAdapter;
  /** Every history write the adapter made, as `push:<path>`/`replace:<path>`. */
  readonly writes: readonly string[];
  /** The reader pressing the browser's Back button. */
  back(): void;
}

function createMemoryHarness(initialPath: string): AdapterHarness {
  const memory = createMemoryAdapter(initialPath);
  const writes: string[] = [];

  return {
    adapter: {
      ...memory,
      navigate(url, navigationOptions) {
        const nextUrl = new URL(String(url), memory.getLocation());

        writes.push(
          `${navigationOptions?.replace ? "replace" : "push"}:${nextUrl.pathname}${nextUrl.search}`,
        );
        memory.navigate(url, navigationOptions);
      },
    },
    writes,
    back: () => memory.back(),
  };
}

function createHistoryHarness(initialPath: string): AdapterHarness {
  const session = createSessionHistory(initialPath);
  let popstateListener: (() => void) | null = null;
  const browserWindow = {
    history: {
      pushState(_state: unknown, _unused: string, url?: string | URL | null) {
        session.write(url ?? session.href, false);
      },
      replaceState(
        _state: unknown,
        _unused: string,
        url?: string | URL | null,
      ) {
        session.write(url ?? session.href, true);
      },
    },
    location: {
      get href() {
        return session.href;
      },
    },
    addEventListener(_type: "popstate", listener: () => void) {
      popstateListener = listener;
    },
    removeEventListener() {
      popstateListener = null;
    },
  };

  return {
    adapter: createHistoryAdapter(browserWindow),
    writes: session.writes,
    back() {
      session.back();
      popstateListener?.();
    },
  };
}

function createNavigationHarness(initialPath: string): AdapterHarness {
  const session = createSessionHistory(initialPath);
  type NavigateListener = (event: {
    navigationType: string;
    destination: { url: string };
    canIntercept: boolean;
    hashChange: boolean;
    intercept(): void;
  }) => void;
  let navigateListener: NavigateListener | null = null;
  const fire = (navigationType: string, url: string) => {
    navigateListener?.({
      navigationType,
      destination: { url },
      canIntercept: true,
      hashChange: false,
      intercept() {},
    });
  };
  const navigationWindow = {
    location: {
      get href() {
        return session.href;
      },
    },
    navigation: {
      currentEntry: null,
      navigate(url: string, options?: { history?: "push" | "replace" }) {
        fire(options?.history ?? "push", new URL(url, session.href).href);
        session.write(url, options?.history === "replace");

        return undefined;
      },
      addEventListener(_type: "navigate", listener: NavigateListener) {
        navigateListener = listener;
      },
      removeEventListener() {
        navigateListener = null;
      },
    },
  };

  return {
    adapter: createNavigationAdapter(navigationWindow),
    writes: session.writes,
    back() {
      session.back();
      fire("traverse", session.href);
    },
  };
}

const listSearch: StandardSchemaV1<{ group?: string }> = {
  "~standard": {
    version: 1,
    vendor: "router-test",
    validate: (value) => ({ value: value as { group?: string } }),
  },
};

/**
 * A router over a page whose grouping is stated in its address, with every
 * accessibility manager replaced by one that logs what the router asked of
 * it.
 */
function createRestatingRouter(harness: AdapterHarness) {
  const log: string[] = [];
  let title = "";
  const accessibility: RouterAccessibilityOptions = {
    document: {
      querySelector: () => null,
      get title() {
        return title;
      },
      set title(value: string) {
        log.push(`title:${value}`);
        title = value;
      },
    },
    getTitle: ({ location }) =>
      `${location.pathname} ${location.searchParams.get("group") ?? "all"}`,
    focusManager: {
      focus() {
        log.push("focus");
        return true;
      },
    },
    routeAnnouncer: {
      announce(message) {
        log.push(`announce:${message}`);
      },
    },
    scrollManager: {
      restore(location, navigationType) {
        log.push(`scroll:${navigationType}:${String(location)}`);
      },
      save(location) {
        log.push(`save:${String(location)}`);
      },
    },
    viewTransition: {
      async run(update) {
        log.push("transition");
        await update();
      },
    },
  };
  const router = createRouter(
    {
      list: route({
        url: "/list",
        search: listSearch,
        warm: (_params, search) => {
          if (search.group === "retired") {
            redirect("/other");
          }
        },
        content: () => "list",
      }),
      other: route({ url: "/other", content: () => "other" }),
    },
    { accessibility, adapter: harness.adapter },
  );

  return { log, router };
}

describe.each([
  ["memory", createMemoryHarness],
  ["History API", createHistoryHarness],
  ["Navigation API", createNavigationHarness],
])("createRouter search updates over the %s adapter", (_name, harnessFor) => {
  it("restates the page without a transition, scroll, focus or announcement", async () => {
    const harness = harnessFor("/list?group=month");
    const { log, router } = createRestatingRouter(harness);
    const snapshots: string[] = [];

    await flushEffects();
    // The initial load runs no effects either.
    expect(log).toEqual([]);

    router.subscribe((snapshot) => {
      snapshots.push(snapshot.href);
    });

    router.setSearchParams({ group: "day" }, { replace: true });
    await flushEffects();

    expect(router.getState().location.href).toBe("/list?group=day");
    expect(snapshots.at(-1)).toBe("/list?group=day");
    expect(harness.writes.at(-1)).toBe("replace:/list?group=day");
    // Only the title follows the address; nothing is saved, because
    // nothing is restored.
    expect(log).toEqual(["title:/list day"]);

    log.length = 0;
    router.setSearchParams({ group: "week" });
    await flushEffects();

    expect(router.getState().location.href).toBe("/list?group=week");
    expect(snapshots.at(-1)).toBe("/list?group=week");
    expect(harness.writes.at(-1)).toBe("push:/list?group=week");
    expect(log).toEqual(["title:/list week"]);
  });

  it("still runs every effect for navigate() to an address differing only in its search", async () => {
    const harness = harnessFor("/list?group=month");
    const { log, router } = createRestatingRouter(harness);

    await flushEffects();
    router.navigate("list");
    await flushEffects();

    expect(router.getState().location.href).toBe("/list");
    expect(harness.writes.at(-1)).toBe("push:/list");
    expect(log).toEqual([
      "save:/list?group=month",
      "transition",
      "title:/list all",
      "scroll:push:/list",
      "focus",
      "announce:/list all",
    ]);
  });

  it("still runs every effect for Back to an address differing only in its search", async () => {
    const harness = harnessFor("/list?group=month");
    const { log, router } = createRestatingRouter(harness);

    await flushEffects();
    router.setSearchParams({ group: "day" });
    await flushEffects();
    log.length = 0;

    harness.back();
    await flushEffects();

    expect(router.getState().location.href).toBe("/list?group=month");
    expect(log).toEqual([
      "save:/list?group=day",
      "transition",
      "title:/list month",
      "scroll:pop:/list?group=month",
      "focus",
      "announce:/list month",
    ]);
  });

  it("runs every effect for a redirect out of a search update", async () => {
    const harness = harnessFor("/list?group=month");
    const { log, router } = createRestatingRouter(harness);

    await flushEffects();
    router.setSearchParams({ group: "retired" }, { replace: true });
    await flushEffects();

    expect(router.getState().location.href).toBe("/other");
    expect(harness.writes.at(-1)).toBe("replace:/other");
    expect(log).toEqual([
      "transition",
      "title:/other all",
      "scroll:push:/other",
      "focus",
      "announce:/other all",
    ]);
  });
});
