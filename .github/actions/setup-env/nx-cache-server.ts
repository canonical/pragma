/**
 * Nx remote cache server for CI — runs on Bun, no dependencies.
 *
 * WHAT THIS DOES
 * Implements the Nx self-hosted remote cache API so that build artifacts
 * (dist/, storybook-static/) can be shared between CI jobs on different
 * runners. The build job stores output tars, check/test jobs fetch them.
 *
 * WHY THIS EXISTS
 * Nx 22's local DB cache doesn't store output files — it only tracks
 * metadata. When a different runner restores the DB, Nx reports cache
 * hits but doesn't restore dist/ folders. The self-hosted remote cache
 * API (NX_SELF_HOSTED_REMOTE_CACHE_SERVER) is the only built-in way to
 * share actual outputs across machines without Nx Cloud or paid plugins.
 *
 * HOW IT WORKS
 * 1. Build job starts this server, runs lerna build:all
 * 2. Nx PUTs gzip tars of each task's outputs to /v1/cache/{hash}
 * 3. Tars are written to /tmp/nx-remote-cache/ (persisted via actions/cache)
 * 4. Check/test jobs start this server, run lerna build:all
 * 5. Nx GETs tars from the server, extracts outputs to the workspace
 *
 * KNOWN NX BUG WORKAROUND
 * Tasks with no output files (e.g. "echo 'No build needed'") produce
 * tars containing only terminalOutput + code metadata. When Nx's native
 * HttpRemoteCache tries to scan the extracted directory, it crashes with
 * ENOENT because no output directory was created. We work around this by
 * returning 404 for metadata-only tars, causing Nx to re-run those cheap
 * tasks instead of crashing.
 *
 * API (per Nx OpenAPI spec)
 *   PUT /v1/cache/{hash}  — store a gzip tar (application/octet-stream)
 *   GET /v1/cache/{hash}  — retrieve a gzip tar
 *
 * ENVIRONMENT VARIABLES
 *   NX_CACHE_SERVER_DIR   — storage directory (default: /tmp/nx-remote-cache)
 *   NX_CACHE_SERVER_PORT  — listen port (default: 9876)
 *
 * LINTING
 *   This file is not part of any package's biome scope. Lint manually:
 *   bunx biome check .github/actions/setup-env/nx-cache-server.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const CACHE_DIR = process.env.NX_CACHE_SERVER_DIR || "/tmp/nx-remote-cache";
const PORT = Number(process.env.NX_CACHE_SERVER_PORT || 9876);

mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Set of hashes whose tars contain real output files (not just metadata).
 * Populated on PUT, consulted on GET to avoid serving metadata-only tars
 * that would crash Nx's HttpRemoteCache. See "KNOWN NX BUG WORKAROUND".
 */
const hashesWithOutputs = new Set<string>();

/**
 * Inspects a gzip tar to determine if it contains actual build outputs.
 * Nx always includes `terminalOutput` and `code` files in every tar.
 * If those are the only entries, the task produced no output files.
 */
function hasOutputFiles(filePath: string): boolean {
  try {
    const listing = execSync(`tar -tzf ${filePath}`, {
      encoding: "utf-8",
      timeout: 5000,
    });
    return listing
      .split("\n")
      .some(
        (f) =>
          f.length > 0 &&
          f !== "terminalOutput" &&
          f !== "code" &&
          !f.endsWith("/"),
      );
  } catch {
    return false;
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/v1\/cache\/(.+)$/);
    if (!match) return new Response("Not found", { status: 404 });

    const hash = match[1];
    const filePath = `${CACHE_DIR}/${hash}.tar`;

    // Store: Nx sends a gzip tar of the task's outputs after a successful build.
    if (req.method === "PUT") {
      const body = await req.arrayBuffer();
      writeFileSync(filePath, Buffer.from(body));
      if (hasOutputFiles(filePath)) {
        hashesWithOutputs.add(hash);
      }
      return new Response("OK", { status: 200 });
    }

    // Retrieve: Nx requests a tar before running a task. If found, it
    // extracts the tar to restore dist/ and other output directories.
    if (req.method === "GET") {
      if (!existsSync(filePath))
        return new Response("Not found", { status: 404 });

      // Return 404 for metadata-only tars (see "KNOWN NX BUG WORKAROUND").
      if (!hashesWithOutputs.has(hash)) {
        if (!hasOutputFiles(filePath)) {
          return new Response("Not found", { status: 404 });
        }
        hashesWithOutputs.add(hash);
      }

      return new Response(readFileSync(filePath), {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  },
});

console.log(`Nx cache server listening on http://localhost:${server.port}`);
