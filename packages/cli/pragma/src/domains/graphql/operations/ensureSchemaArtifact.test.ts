import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { EX_NAMESPACE, GRAPHQL_CLEAN_TTL, GRAPHQL_FATAL_TTL } from "#testing";
import { DEFAULT_PREFIX_MAP } from "../../shared/prefixes.js";
import type { SemanticPackage } from "../../shared/semanticPackage.js";
import ensureSchemaArtifact, {
  resolveSchemaArtifactPath,
} from "./ensureSchemaArtifact.js";

const PREFIXES = { ...DEFAULT_PREFIX_MAP, ex: EX_NAMESPACE };

let dataDir: string;
let cwd: string;
let originalXdgData: string | undefined;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "pragma-schema-artifact-data-"));
  cwd = mkdtempSync(join(tmpdir(), "pragma-schema-artifact-cwd-"));
  originalXdgData = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = dataDir;
  // The global test setup disables artifact emission; this suite tests it.
  delete process.env.PRAGMA_SCHEMA_ARTIFACT;
});

afterAll(() => {
  if (originalXdgData === undefined) {
    delete process.env.XDG_DATA_HOME;
  } else {
    process.env.XDG_DATA_HOME = originalXdgData;
  }
  process.env.PRAGMA_SCHEMA_ARTIFACT = "off";
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

afterEach(() => {
  delete process.env.PRAGMA_SCHEMA_ARTIFACT;
  rmSync(join(dataDir, "pragma"), { recursive: true, force: true });
});

function makeRuntime(ttl: string): Parameters<typeof ensureSchemaArtifact>[0] {
  const pkg: SemanticPackage = {
    name: "@test/ontology",
    version: "1.0.0",
    source: "local",
    graphs: [{ path: "ontology.ttl", content: ttl, format: "turtle" }],
    skills: [],
    stories: [],
  };
  return {
    cwd,
    packages: [pkg],
    store: { prefixes: PREFIXES } as never,
  };
}

describe("resolveSchemaArtifactPath", () => {
  it("uses the XDG data dir when no project config is in tree", () => {
    expect(resolveSchemaArtifactPath(cwd)).toBe(
      join(dataDir, "pragma", "schema.graphql"),
    );
  });

  it("uses .pragma/ beside the project config when one is in tree", () => {
    const project = mkdtempSync(join(tmpdir(), "pragma-schema-project-"));
    try {
      writeFileSync(join(project, "pragma.config.json"), "{}", "utf-8");
      const nested = join(project, "src");
      mkdirSync(nested);
      expect(resolveSchemaArtifactPath(nested)).toBe(
        join(project, ".pragma", "schema.graphql"),
      );
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("ensureSchemaArtifact", () => {
  it("writes the artifact with a source-hash header on first use", async () => {
    const result = await ensureSchemaArtifact(makeRuntime(GRAPHQL_CLEAN_TTL));

    expect(result.status).toBe("written");
    expect(existsSync(result.path)).toBe(true);

    const content = readFileSync(result.path, "utf-8");
    expect(content.startsWith("# pragma:sources ")).toBe(true);
    expect(content).toContain("type Thing");
  });

  it("is fresh on a second run with unchanged sources", async () => {
    const runtime = makeRuntime(GRAPHQL_CLEAN_TTL);
    await ensureSchemaArtifact(runtime);

    const second = await ensureSchemaArtifact(runtime);
    expect(second.status).toBe("fresh");
  });

  it("rewrites when the sources change", async () => {
    await ensureSchemaArtifact(makeRuntime(GRAPHQL_CLEAN_TTL));

    const changed = await ensureSchemaArtifact(
      makeRuntime(`${GRAPHQL_CLEAN_TTL}\n# changed`),
    );
    expect(changed.status).toBe("written");
  });

  it("leaves a stale artifact in place when compilation fails", async () => {
    const first = await ensureSchemaArtifact(makeRuntime(GRAPHQL_CLEAN_TTL));
    const before = readFileSync(first.path, "utf-8");

    const failed = await ensureSchemaArtifact(makeRuntime(GRAPHQL_FATAL_TTL));
    expect(failed.status).toBe("failed");
    expect(readFileSync(first.path, "utf-8")).toBe(before);
  });

  it("compiles from the parseable sources when one is malformed", async () => {
    const pkg: SemanticPackage = {
      name: "@test/ontology",
      version: "1.0.0",
      source: "local",
      graphs: [
        { path: "clean.ttl", content: GRAPHQL_CLEAN_TTL, format: "turtle" },
        {
          path: "broken.ttl",
          content: "this is not turtle .",
          format: "turtle",
        },
      ],
      skills: [],
      stories: [],
    };
    const result = await ensureSchemaArtifact({
      cwd,
      packages: [pkg],
      store: { prefixes: PREFIXES } as never,
    });

    expect(result.status).toBe("written");
    expect(readFileSync(result.path, "utf-8")).toContain("type Thing");
  });

  it("skips when no sources resolve", async () => {
    const result = await ensureSchemaArtifact({
      cwd,
      packages: [],
      store: { prefixes: PREFIXES } as never,
    });
    expect(result.status).toBe("skipped");
  });

  it("skips when disabled via PRAGMA_SCHEMA_ARTIFACT=off", async () => {
    process.env.PRAGMA_SCHEMA_ARTIFACT = "off";
    const result = await ensureSchemaArtifact(makeRuntime(GRAPHQL_CLEAN_TTL));
    expect(result.status).toBe("skipped");
    expect(existsSync(result.path)).toBe(false);
  });
});
