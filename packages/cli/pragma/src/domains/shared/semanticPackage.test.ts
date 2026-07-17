import { describe, expect, it } from "vitest";
import type { PackageRef } from "../refs/operations/parseRef.js";
import type { PackageLoader, SemanticPackage } from "./semanticPackage.js";
import { resolveSemanticPackages } from "./semanticPackage.js";

function makeRef(pkg: string): PackageRef {
  return { kind: "npm", pkg };
}

function makePackage(name: string): SemanticPackage {
  return {
    name,
    version: "1.0.0",
    source: "local",
    graphs: [{ path: `${name}/data.ttl`, content: "", format: "turtle" }],
    skills: [],
    stories: [],
  };
}

describe("resolveSemanticPackages", () => {
  it("resolves each ref through the loader chain", async () => {
    const loader: PackageLoader = {
      name: "local",
      resolve: (ref) => makePackage(ref.pkg),
    };

    const packages = await resolveSemanticPackages(
      [makeRef("a"), makeRef("b")],
      [loader],
    );

    expect(packages.map((pkg) => pkg.name)).toEqual(["a", "b"]);
  });

  it("drops refs no loader can resolve", async () => {
    const loader: PackageLoader = {
      name: "local",
      resolve: (ref) => (ref.pkg === "a" ? makePackage("a") : undefined),
    };

    const packages = await resolveSemanticPackages(
      [makeRef("a"), makeRef("b")],
      [loader],
    );

    expect(packages.map((pkg) => pkg.name)).toEqual(["a"]);
  });

  // Regression: the bundled loader returns ONE cached aggregate package for
  // every ref it serves. Including it once per ref loaded its graphs into
  // the store multiple times, re-minting blank nodes on each parse — which
  // triplicated blank-node subgraphs (standard do/don't examples) whenever
  // all three default refs fell back to the bundled data.
  it("includes a package instance resolved for multiple refs only once", async () => {
    const aggregate = makePackage("(bundled)");
    const loader: PackageLoader = {
      name: "bundled",
      resolve: () => aggregate,
    };

    const packages = await resolveSemanticPackages(
      [makeRef("a"), makeRef("b"), makeRef("c")],
      [loader],
    );

    expect(packages).toHaveLength(1);
    expect(packages[0]).toBe(aggregate);
  });

  it("keeps distinct packages from a mixed loader chain", async () => {
    const aggregate = makePackage("(bundled)");
    const git: PackageLoader = {
      name: "git",
      resolve: (ref) => (ref.pkg === "a" ? makePackage("a") : undefined),
    };
    const bundled: PackageLoader = {
      name: "bundled",
      resolve: () => aggregate,
    };

    const packages = await resolveSemanticPackages(
      [makeRef("a"), makeRef("b"), makeRef("c")],
      [git, bundled],
    );

    expect(packages.map((pkg) => pkg.name)).toEqual(["a", "(bundled)"]);
  });
});
