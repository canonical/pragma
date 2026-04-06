import { describe, expect, it } from "vitest";
import group from "./group.js";
import route from "./route.js";
import wrapper from "./wrapper.js";

describe("group", () => {
  it("prepends a wrapper to each route without nesting route trees", () => {
    const settingsLayout = wrapper({
      id: "settings:layout",
      component: ({ children }) => children,
    });

    const settingsRoutes = group(settingsLayout, [
      route({
        url: "/settings/profile",
        content: () => "profile",
      }),
      route({
        url: "/settings/billing",
        content: () => "billing",
      }),
    ] as const);

    expect(settingsRoutes).toHaveLength(2);
    expect(settingsRoutes[0].wrappers[0]).toBe(settingsLayout);
    expect(settingsRoutes[1].wrappers[0]).toBe(settingsLayout);
  });

  it("preserves existing wrapper order after prepending a new wrapper", () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const sectionLayout = wrapper({
      id: "section:layout",
      component: ({ children }) => children,
    });

    const sectionRoute = route({
      url: "/section",
      content: () => "section",
      wrappers: [sectionLayout] as const,
    });

    const [groupedRoute] = group(appLayout, [sectionRoute] as const);

    expect(groupedRoute.wrappers).toEqual([appLayout, sectionLayout]);
  });
});
