import { dryRun, type Effect } from "../../../runtime/task/src/index.js";
import { describe, expect, it } from "vitest";
import { generators } from "./index.js";

type WriteFileEffect = Extract<Effect, { _tag: "WriteFile" }>;
type AppendFileEffect = Extract<Effect, { _tag: "AppendFile" }>;

const getWritePaths = (effects: readonly Effect[]): string[] =>
  effects
    .filter((effect): effect is WriteFileEffect => effect._tag === "WriteFile")
    .map((effect) => effect.path);

describe("generators barrel", () => {
  it("exports application/react generator", () => {
    expect(generators["application/react"]).toBeDefined();
    expect(generators["application/react"].meta.name).toBe("application/react");
  });

  it("exports route generator", () => {
    expect(generators.route.meta.name).toBe("route");
  });

  it("exports wrapper generator", () => {
    expect(generators.wrapper.meta.name).toBe("wrapper");
  });
});

describe("application/react generator", () => {
  const generator = generators["application/react"];

  it("requires the routed SSR preset flags", () => {
    expect(() =>
      generator.generate({
        appPath: "my-react-app",
        router: false,
        runInstall: false,
        ssr: true,
      }),
    ).toThrow(/summon application react --ssr --router/);
  });

  it("creates the expected routed SSR app structure", () => {
    const result = dryRun(
      generator.generate({
        appPath: "my-react-app",
        router: true,
        runInstall: false,
        ssr: true,
      }),
    );

    const paths = getWritePaths(result.effects);

    expect(paths).toContain("my-react-app/package.json");
    expect(paths).toContain("my-react-app/src/router.tsx");
    expect(paths).toContain("my-react-app/src/routes/index.tsx");
    expect(paths).toContain("my-react-app/src/routes/home.tsx");
    expect(paths).toContain("my-react-app/src/routes/about.tsx");
    expect(paths).toContain("my-react-app/src/wrappers/app-shell.tsx");
    expect(paths).toContain("my-react-app/src/ssr/entry-client.tsx");
    expect(paths).toContain("my-react-app/src/ssr/entry-server.tsx");
    expect(paths).toContain("my-react-app/src/ssr/server.ts");
  });
});

describe("route generator", () => {
  const generator = generators.route;

  it("creates a route module and appends an index export", () => {
    const result = dryRun(
      generator.generate({
        routePath: "settings/billing",
      }),
    );

    const paths = getWritePaths(result.effects);
    const append = result.effects.find(
      (effect): effect is AppendFileEffect => effect._tag === "AppendFile",
    );

    expect(paths).toContain("src/routes/settings/billing.tsx");
    expect(append?.path).toBe("src/routes/index.tsx");
    expect(append?.content).toContain("settings/billing");
  });
});

describe("wrapper generator", () => {
  const generator = generators.wrapper;

  it("creates a wrapper module and appends an index export", () => {
    const result = dryRun(
      generator.generate({
        wrapperPath: "settings",
      }),
    );

    const paths = getWritePaths(result.effects);
    const append = result.effects.find(
      (effect): effect is AppendFileEffect => effect._tag === "AppendFile",
    );

    expect(paths).toContain("src/wrappers/settings.tsx");
    expect(append?.path).toBe("src/wrappers/index.tsx");
    expect(append?.content).toContain("settings");
  });
});