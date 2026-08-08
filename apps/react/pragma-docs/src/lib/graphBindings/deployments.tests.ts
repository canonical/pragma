/**
 * The selector's fail-safe rule, and the key-set contract every deployment
 * has to satisfy.
 *
 * WHAT WOULD BREAK WITHOUT THESE. `GRAPH_BINDINGS` is resolved once at module
 * scope from an environment variable, in three independent module registries
 * (Bun native prepare, Vite SSR render, the client bundle). The consequence of
 * getting the rule wrong is not an exception — it is a lens quietly querying
 * the wrong class, or a store that does not fulfil the operation the renderer
 * runs. `selectDeployment` takes its name as an ARGUMENT precisely so that
 * rule can be pinned here rather than discovered in a browser.
 *
 * The specific pins on the `metro` table are dataset facts, not preferences:
 * they are the reason `test/e2e/metro.e2e.ts` can assert what it asserts, and
 * changing either one silently weakens that proof.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEPLOYMENT,
  DEPLOYMENT_ENV_VAR,
  DEPLOYMENTS,
  selectDeployment,
} from "./deployments.js";

describe("selectDeployment", () => {
  it("falls back to pragma for an unset, empty or unknown name", () => {
    // FAIL-SAFE is the whole design. A misspelt variable must degrade to the
    // shipped default, never to an empty page — which is what a lookup that
    // returned `undefined` and got spread into a query variable would give.
    for (const name of [undefined, "", "pragmaa", "metro "]) {
      expect(selectDeployment(name)).toBe(DEPLOYMENTS.pragma);
    }
  });

  it("selects the named deployment", () => {
    expect(selectDeployment("metro")).toBe(DEPLOYMENTS.metro);
    expect(selectDeployment(DEFAULT_DEPLOYMENT)).toBe(DEPLOYMENTS.pragma);
  });

  it("names its own default among the deployments it can select", () => {
    // `DEFAULT_DEPLOYMENT` is a string, so nothing stops it drifting away
    // from a real key — after which the "fall back to the default" arm would
    // be unreachable and every unknown name would resolve to `pragma` only
    // by the literal that happens to be written in the fallback.
    expect(Object.keys(DEPLOYMENTS)).toContain(DEFAULT_DEPLOYMENT);
  });
});

describe("DEPLOYMENTS", () => {
  it("gives every deployment the SAME key set", () => {
    // Consumers read `GRAPH_BINDINGS.components` without knowing which
    // deployment answered. A missing key is `undefined.classUri` at module
    // scope — a boot crash in the SSR brick, not a degraded page.
    const keySets = Object.values(DEPLOYMENTS).map((table) =>
      Object.keys(table).sort().join(","),
    );
    expect(new Set(keySets).size).toBe(1);
  });

  it("leaves pragma exactly as it shipped before deployments existed", () => {
    // The one place literal strings ARE pinned. Every existing test, story
    // and fixture in the app was written against these three values, and the
    // whole claim of this seam is that an unset environment changes nothing.
    expect(DEPLOYMENTS.pragma).toEqual({
      standards: { classUri: "cs:CodeStandard" },
      components: { classUri: "ds:Component" },
      patterns: { classUri: "ds:Pattern" },
    });
  });

  it("binds metro's standards lens to a class with SUBCLASSED instances", () => {
    // `metro:Station` has 14 direct instances plus 2 `metro:Interchange`
    // (a Station subclass), so the standards index renders TWO group sections
    // and its jump-nav is exercised. `metro:Stop` would render one group and
    // no rail at all — the lens would go green having shown none of its
    // structure. Dataset fact:
    // packages/docsite/graph-example/src/lib/provider/dataset.ts
    expect(DEPLOYMENTS.metro.standards.classUri).toBe("metro:Station");
  });

  it("binds metro's components lens to a class with NO instances", () => {
    // The metro deployment has no components lens. `geo:GeoPoint` appears in
    // the dataset only as an embedded `location` value and has zero
    // instances, so the term inspector's D31 landing rule can never fire and
    // never link a reader to `/components/:uri`, a route metro cannot serve.
    // `test/e2e/metro.e2e.ts` asserts that outcome over HTTP; this pins the
    // choice that makes it true. Dataset fact:
    // packages/docsite/graph-example/src/lib/provider/dataset.ts
    expect(DEPLOYMENTS.metro.components.classUri).toBe("geo:GeoPoint");
  });
});

describe("DEPLOYMENT_ENV_VAR", () => {
  it("carries the VITE_ prefix a client bundle requires", () => {
    // Vite exposes only `VITE_*` to the browser. Without the prefix the
    // client would silently read nothing while the server read the value,
    // and the two registries would prepare and render different classes.
    expect(DEPLOYMENT_ENV_VAR.startsWith("VITE_")).toBe(true);
  });
});
