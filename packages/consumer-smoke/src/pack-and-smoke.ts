#!/usr/bin/env bun
/**
 * pack-and-smoke.ts — proves the published packages are installable and
 * usable by an EXTERNAL consumer.
 *
 * It `npm pack`s every publishable workspace package into tarballs, then
 * generates a throwaway Vite + React app OUTSIDE the workspace whose
 * package.json maps every `@canonical/*` name to its tarball via npm
 * `overrides`, installs with npm (what external consumers use — not bun),
 * and exercises the packages the way a consumer would.
 *
 * Assertion tiers:
 *   (a) FAILING   npm install exits 0
 *   (b) ADVISORY  `npm ls react` resolves to a single physical copy
 *                 (only truly holds after react moves to peerDependencies)
 *   (c) FAILING   `tsc --noEmit` under NodeNext resolution
 *   (d) FAILING   `vite build` (client), `vite build --ssr`, and a Node
 *                 `renderToString` + jsdom `hydrateRoot` of a page using
 *                 <Button> from @canonical/react-ds-global; the client
 *                 build must emit non-empty CSS
 *   (e) ADVISORY  publint + @arethetypeswrong/cli over every tarball
 *                 (exports maps are not landed everywhere yet)
 *
 * ADVISORY tiers print warnings but never fail the run. Exits non-zero if
 * any FAILING tier fails.
 *
 * Usage:
 *   bun packages/consumer-smoke/src/pack-and-smoke.ts [--keep] [--skip-advisory]
 *
 * Env:
 *   CONSUMER_SMOKE_DIR  work dir override (default: mkdtemp under os.tmpdir(),
 *                       i.e. always outside the workspace)
 *
 * Prerequisite: the publishable set is built, e.g.
 *   bunx nx run-many -t build --projects="$(bun packages/consumer-smoke/src/list-publishable.ts)"
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scrubbedEnv, scrubProcessEnv } from "./env.js";
import { packFilename } from "./npm-pack.js";
import { getPublishablePackages, type WorkspacePackage } from "./workspace.js";

// This script spawns a large third-party surface (npm install of external
// dependencies, vite, tsc, publint, attw, node). None of it needs any
// credential — in tag.yml's publish job the runner env carries the OIDC
// trusted-publishing token vars, which must not leak into that surface.
// Scrub our own env first (covers anything spawned indirectly) …
scrubProcessEnv();

const PUBLINT_VERSION = "0.3.21";
const ATTW_VERSION = "0.18.5";
const PACK_CONCURRENCY = 8;
const LINT_CONCURRENCY = 4;

const keep = process.argv.includes("--keep");
const skipAdvisory = process.argv.includes("--skip-advisory");

// ---------------------------------------------------------------------------
// Small runners
// ---------------------------------------------------------------------------

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
  /** stdout + stderr merged, for human-readable logs — never parse this. */
  output: string;
}

async function run(
  cmd: string[],
  opts: { cwd: string; env?: Record<string, string> },
): Promise<RunResult> {
  const proc = Bun.spawn(cmd, {
    cwd: opts.cwd,
    // … and give every child an explicitly scrubbed env (never spread
    // process.env back in): no token/secret-shaped variable reaches a
    // spawned process.
    env: scrubbedEnv(opts.env),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  const output = [stdout.trimEnd(), stderr.trimEnd()]
    .filter(Boolean)
    .join("\n");
  return { code, stdout, stderr, output };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

interface StepResult {
  name: string;
  tier: "FAILING" | "ADVISORY";
  status: "pass" | "warn" | "fail";
  detail: string;
}

const steps: StepResult[] = [];

function record(step: StepResult): void {
  steps.push(step);
  const icon =
    step.status === "pass" ? "PASS" : step.status === "warn" ? "WARN" : "FAIL";
  console.log(`\n[${icon}] (${step.tier}) ${step.name} — ${step.detail}`);
}

function indent(text: string, maxLines = 40): string {
  const lines = text.split("\n");
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines)
    shown.push(`… (${lines.length - maxLines} more lines)`);
  return shown.map((line) => `    ${line}`).join("\n");
}

// ---------------------------------------------------------------------------
// 1. Enumerate + sanity-check the publishable set
// ---------------------------------------------------------------------------

const packages = getPublishablePackages();
console.log(`consumer-smoke: ${packages.length} publishable packages`);

const unbuilt = packages.filter((pkg) => {
  const files = (pkg.manifest.files ?? []) as string[];
  const scripts = (pkg.manifest.scripts ?? {}) as Record<string, string>;
  return (
    scripts.build &&
    files.some((entry) => entry === "dist" || entry.startsWith("dist/")) &&
    !existsSync(join(pkg.dir, "dist"))
  );
});
if (unbuilt.length > 0) {
  console.error(
    `These packages ship dist/ but are not built: ${unbuilt
      .map((pkg) => pkg.name)
      .join(
        ", ",
      )}\nRun: bunx nx run-many -t build --projects="$(bun packages/consumer-smoke/src/list-publishable.ts)"`,
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 2. Work dir (always OUTSIDE the workspace) + npm pack every package
// ---------------------------------------------------------------------------

const smokeRoot =
  process.env.CONSUMER_SMOKE_DIR ??
  mkdtempSync(join(tmpdir(), "pragma-consumer-smoke-"));
const tarballDir = join(smokeRoot, "tarballs");
const appDir = join(smokeRoot, "app");
rmSync(appDir, { recursive: true, force: true });
mkdirSync(tarballDir, { recursive: true });
mkdirSync(appDir, { recursive: true });
console.log(`work dir: ${smokeRoot}`);

console.log(`packing ${packages.length} tarballs with npm pack …`);
const packStart = Date.now();
const tarballs = new Map<string, string>(); // package name -> absolute tarball path

const packFailures: string[] = [];
await mapLimit(packages, PACK_CONCURRENCY, async (pkg: WorkspacePackage) => {
  const result = await run(
    ["npm", "pack", pkg.dir, "--pack-destination", tarballDir, "--json"],
    { cwd: tarballDir },
  );
  if (result.code !== 0) {
    packFailures.push(`${pkg.name}:\n${indent(result.output, 15)}`);
    return;
  }
  try {
    // Parse stdout ONLY — stderr carries npm warnings/lifecycle output and
    // must never reach the JSON parser (see npm-pack.ts).
    tarballs.set(pkg.name, join(tarballDir, packFilename(result)));
  } catch (error) {
    packFailures.push(
      `${pkg.name}: could not parse npm pack output (${error})`,
    );
  }
});

if (packFailures.length > 0) {
  console.error(`npm pack failed for:\n${packFailures.join("\n")}`);
  process.exit(1);
}
console.log(
  `packed ${tarballs.size} tarballs in ${Math.round((Date.now() - packStart) / 1000)}s`,
);

// ---------------------------------------------------------------------------
// 3. Generate the external consumer app
// ---------------------------------------------------------------------------

const dsGlobal = packages.find(
  (pkg) => pkg.name === "@canonical/react-ds-global",
);
if (!dsGlobal) {
  console.error("@canonical/react-ds-global not found in the publishable set");
  process.exit(2);
}
const dsGlobalDeps = (dsGlobal.manifest.dependencies ?? {}) as Record<
  string,
  string
>;
const dsGlobalPeers = (dsGlobal.manifest.peerDependencies ?? {}) as Record<
  string,
  string
>;
// Follow whichever react range ds-global declares so npm can dedupe.
const reactRange = dsGlobalPeers.react ?? dsGlobalDeps.react ?? "^19.2.0";
const dsGlobalSpec = `file:${tarballs.get("@canonical/react-ds-global")}`;

const overrides = Object.fromEntries(
  [...tarballs.entries()].map(([name, path]) => [name, `file:${path}`]),
);

const appManifest = {
  name: "pragma-consumer-smoke",
  private: true,
  version: "0.0.0",
  type: "module",
  dependencies: {
    "@canonical/react-ds-global": dsGlobalSpec,
    react: reactRange,
    "react-dom": reactRange,
  },
  devDependencies: {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.0",
    jsdom: "^28.1.0",
    typescript: "^5.9.3",
    vite: "^8.0.1",
  },
  // npm (not bun) overrides: every @canonical/* resolves to its local
  // tarball, including transitive dependencies between the packages.
  overrides,
};

const files: Record<string, string> = {
  "package.json": `${JSON.stringify(appManifest, null, 2)}\n`,

  "tsconfig.json": `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        jsx: "react-jsx",
        strict: true,
        verbatimModuleSyntax: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ["src"],
    },
    null,
    2,
  )}\n`,

  "vite.config.ts": `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  ssr: {
    // Bundle the design-system packages during the SSR build so their
    // \`import "./styles.css"\` statements are resolved (and verified)
    // instead of crashing Node's ESM loader.
    noExternal: [/^@canonical\\//],
  },
});
`,

  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>pragma consumer smoke</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>
`,

  "src/App.tsx": `import { Button } from "@canonical/react-ds-global";
import type { ReactElement } from "react";

const App = (): ReactElement => (
  <main>
    <h1>Consumer smoke</h1>
    <Button>Install me</Button>
  </main>
);

export default App;
`,

  "src/entry-client.tsx": `import { hydrateRoot } from "react-dom/client";
import App from "./App.js";

const root = document.getElementById("root");
if (root) {
  hydrateRoot(root, <App />);
}
`,

  "src/entry-server.tsx": `import { renderToString } from "react-dom/server";
import App from "./App.js";

export { App };

export function render(): string {
  return renderToString(<App />);
}
`,

  // Plain JS on purpose: runs directly under Node against the built SSR
  // bundle, the way a consumer's server would.
  "ssr-check.mjs": `import assert from "node:assert/strict";
import { createRequire } from "node:module";

const consoleErrors = [];
const originalError = console.error;
console.error = (...args) => {
  consoleErrors.push(args.map(String).join(" "));
  originalError(...args);
};

// --- Server pass: renderToString from the Vite SSR bundle -----------------
const { render, App } = await import("./dist/server/entry-server.js");
const html = render();
assert.ok(html.length > 0, "SSR produced empty HTML");
assert.ok(html.includes("Consumer smoke"), "SSR HTML lost the heading");
assert.ok(html.includes("Install me"), "SSR HTML lost the Button label");
assert.ok(/<button[\\s>]/.test(html), "SSR HTML has no <button> element");
console.log(\`SSR renderToString OK (\${html.length} bytes)\`);

// --- Client pass: hydrate the server HTML in a DOM ------------------------
const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
const dom = new JSDOM(
  \`<!doctype html><html><body><div id="root">\${html}</div></body></html>\`,
  { url: "http://localhost/", pretendToBeVisual: true },
);
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (key in globalThis) continue;
  try {
    globalThis[key] = dom.window[key];
  } catch {}
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});

const React = await import("react");
const { hydrateRoot } = await import("react-dom/client");

const recoverable = [];
hydrateRoot(document.getElementById("root"), React.createElement(App), {
  onRecoverableError: (error) => recoverable.push(String(error)),
});
await new Promise((resolve) => setTimeout(resolve, 300));

assert.equal(
  recoverable.length,
  0,
  \`hydration reported recoverable errors:\\n\${recoverable.join("\\n")}\`,
);
const hydrationComplaints = consoleErrors.filter((message) =>
  /hydrat|did not match/i.test(message),
);
assert.equal(
  hydrationComplaints.length,
  0,
  \`hydration logged errors:\\n\${hydrationComplaints.join("\\n")}\`,
);
assert.ok(document.querySelector("button"), "hydrated DOM lost the <button>");
console.log("hydrateRoot OK (no hydration errors, <button> present)");
console.error = originalError;
process.exit(0);
`,
};

for (const [relPath, content] of Object.entries(files)) {
  const absPath = join(appDir, relPath);
  mkdirSync(join(absPath, ".."), { recursive: true });
  await Bun.write(absPath, content);
}
console.log(`generated consumer app at ${appDir}`);

// ---------------------------------------------------------------------------
// 4. Tiered assertions
// ---------------------------------------------------------------------------

// (a) FAILING — npm install
console.log("\n--- (a) npm install ---");
const install = await run(
  ["npm", "install", "--no-audit", "--no-fund", "--loglevel=error"],
  { cwd: appDir },
);
if (install.code === 0) {
  record({
    name: "npm install",
    tier: "FAILING",
    status: "pass",
    detail: "external consumer install from tarballs succeeded",
  });
} else {
  record({
    name: "npm install",
    tier: "FAILING",
    status: "fail",
    detail: `npm install exited ${install.code}`,
  });
  console.error(indent(install.output));
}

if (install.code === 0) {
  // (b) ADVISORY — single physical copy of react
  console.log("\n--- (b) npm ls react ---");
  const lsReact = await run(["npm", "ls", "react", "--all", "--parseable"], {
    cwd: appDir,
  });
  const reactPaths = [
    ...new Set(
      // `npm ls --parseable` writes the paths to stdout; `output` is the
      // merged human-readable log and must never be parsed.
      lsReact.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /node_modules[\\/]react$/.test(line)),
    ),
  ];
  if (lsReact.code === 0 && reactPaths.length === 1) {
    record({
      name: "npm ls react (single copy)",
      tier: "ADVISORY",
      status: "pass",
      detail: `exactly one physical react at ${reactPaths[0]}`,
    });
  } else {
    record({
      name: "npm ls react (single copy)",
      tier: "ADVISORY",
      status: "warn",
      detail:
        reactPaths.length !== 1
          ? `${reactPaths.length} physical copies of react (expected 1) — will only truly hold after react moves to peerDependencies`
          : `npm ls exited ${lsReact.code} (invalid dependency tree)`,
    });
    console.warn(indent(reactPaths.join("\n") || lsReact.output, 20));
  }

  // (c) FAILING — tsc --noEmit under NodeNext
  console.log("\n--- (c) tsc --noEmit (NodeNext) ---");
  const tsc = await run(
    [join(appDir, "node_modules", ".bin", "tsc"), "--noEmit"],
    {
      cwd: appDir,
    },
  );
  record({
    name: "tsc --noEmit (NodeNext)",
    tier: "FAILING",
    status: tsc.code === 0 ? "pass" : "fail",
    detail:
      tsc.code === 0
        ? "types of the published packages resolve and check cleanly"
        : `tsc exited ${tsc.code}`,
  });
  if (tsc.code !== 0) console.error(indent(tsc.output));

  // (d) FAILING — vite build (client + SSR) and Node render/hydrate
  console.log("\n--- (d) vite build + SSR render/hydrate ---");
  const viteBin = join(appDir, "node_modules", ".bin", "vite");
  const clientBuild = await run(
    [viteBin, "build", "--outDir", "dist/client", "--logLevel", "warn"],
    { cwd: appDir },
  );
  let cssDetail = "";
  let cssOk = false;
  if (clientBuild.code === 0) {
    const cssGlob = new Bun.Glob("dist/client/**/*.css");
    let cssBytes = 0;
    let cssCount = 0;
    for (const match of cssGlob.scanSync({ cwd: appDir })) {
      cssCount += 1;
      cssBytes += Bun.file(join(appDir, match)).size;
    }
    cssOk = cssCount > 0 && cssBytes > 0;
    cssDetail = `${cssCount} css asset(s), ${cssBytes} bytes`;
  }
  record({
    name: "vite build (client, css emitted)",
    tier: "FAILING",
    status: clientBuild.code === 0 && cssOk ? "pass" : "fail",
    detail:
      clientBuild.code !== 0
        ? `vite build exited ${clientBuild.code}`
        : cssOk
          ? cssDetail
          : `build passed but no css was emitted (${cssDetail})`,
  });
  if (clientBuild.code !== 0) console.error(indent(clientBuild.output));

  const ssrBuild = await run(
    [
      viteBin,
      "build",
      "--ssr",
      "src/entry-server.tsx",
      "--outDir",
      "dist/server",
      "--logLevel",
      "warn",
    ],
    { cwd: appDir },
  );
  if (ssrBuild.code !== 0) {
    record({
      name: "vite build (ssr) + renderToString + hydrate",
      tier: "FAILING",
      status: "fail",
      detail: `vite ssr build exited ${ssrBuild.code}`,
    });
    console.error(indent(ssrBuild.output));
  } else {
    const ssrRun = await run(["node", "ssr-check.mjs"], { cwd: appDir });
    record({
      name: "vite build (ssr) + renderToString + hydrate",
      tier: "FAILING",
      status: ssrRun.code === 0 ? "pass" : "fail",
      detail:
        ssrRun.code === 0
          ? "renderToString + jsdom hydrateRoot of <Button> page succeeded"
          : `ssr-check exited ${ssrRun.code}`,
    });
    console.log(indent(ssrRun.output, ssrRun.code === 0 ? 10 : 40));
  }
}

// (e) ADVISORY — publint + attw over every tarball
if (!skipAdvisory) {
  console.log("\n--- (e) publint + arethetypeswrong (ADVISORY) ---");
  const lintTargets = [...tarballs.entries()];

  const publintResults = await mapLimit(
    lintTargets,
    LINT_CONCURRENCY,
    async ([name, tarball]) => ({
      name,
      result: await run(
        ["bunx", `publint@${PUBLINT_VERSION}`, "run", tarball],
        {
          cwd: smokeRoot,
        },
      ),
    }),
  );
  const publintFailures = publintResults.filter(
    ({ result }) => result.code !== 0,
  );
  record({
    name: "publint over tarballs",
    tier: "ADVISORY",
    status: publintFailures.length === 0 ? "pass" : "warn",
    detail: `${publintFailures.length}/${lintTargets.length} tarballs with publint errors`,
  });
  for (const { name, result } of publintFailures.slice(0, 10)) {
    console.warn(`  publint ${name}:\n${indent(result.output, 12)}`);
  }
  if (publintFailures.length > 10)
    console.warn(`  … and ${publintFailures.length - 10} more`);

  const attwResults = await mapLimit(
    lintTargets,
    LINT_CONCURRENCY,
    async ([name, tarball]) => ({
      name,
      result: await run(
        ["bunx", `@arethetypeswrong/cli@${ATTW_VERSION}`, tarball],
        { cwd: smokeRoot },
      ),
    }),
  );
  const attwFailures = attwResults.filter(({ result }) => result.code !== 0);
  record({
    name: "arethetypeswrong over tarballs",
    tier: "ADVISORY",
    status: attwFailures.length === 0 ? "pass" : "warn",
    detail: `${attwFailures.length}/${lintTargets.length} tarballs with attw findings`,
  });
  for (const { name } of attwFailures) console.warn(`  attw: ${name}`);
  for (const { name, result } of attwFailures.slice(0, 3)) {
    console.warn(`  attw detail ${name}:\n${indent(result.output, 25)}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Summary
// ---------------------------------------------------------------------------

console.log("\n=== consumer-smoke summary ===");
for (const step of steps) {
  console.log(
    `${step.status.toUpperCase().padEnd(4)}  ${step.tier.padEnd(8)}  ${step.name} — ${step.detail}`,
  );
}

const failed = steps.filter(
  (step) => step.tier === "FAILING" && step.status === "fail",
);
const warned = steps.filter((step) => step.status === "warn");
console.log(
  `\n${steps.length} checks: ${steps.length - failed.length - warned.length} pass, ${warned.length} advisory warn, ${failed.length} fail`,
);

if (failed.length === 0 && !keep && !process.env.CONSUMER_SMOKE_DIR) {
  rmSync(smokeRoot, { recursive: true, force: true });
} else {
  console.log(`work dir kept at ${smokeRoot}`);
}

process.exit(failed.length === 0 ? 0 : 1);
