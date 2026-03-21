/**
 * Minimal Nx remote cache server for CI.
 *
 * Stores and retrieves task output tars on the local filesystem.
 * Used with NX_SELF_HOSTED_REMOTE_CACHE_SERVER to share build
 * artifacts between CI jobs via actions/cache.
 *
 * API (Nx OpenAPI spec):
 *   PUT /v1/cache/{hash}  — store tar (application/octet-stream)
 *   GET /v1/cache/{hash}  — retrieve tar
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const CACHE_DIR = process.env.NX_CACHE_SERVER_DIR || "/tmp/nx-remote-cache";
const PORT = Number(process.env.NX_CACHE_SERVER_PORT || 9876);

mkdirSync(CACHE_DIR, { recursive: true });

// Track which hashes have actual output files (not just terminalOutput/code).
// Tars without output files cause Nx's HttpRemoteCache to crash with ENOENT.
const hashesWithOutputs = new Set<string>();

function checkHasOutputFiles(filePath: string): boolean {
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

    if (req.method === "PUT") {
      const body = await req.arrayBuffer();
      writeFileSync(filePath, Buffer.from(body));
      if (checkHasOutputFiles(filePath)) {
        hashesWithOutputs.add(hash);
      }
      return new Response("OK", { status: 200 });
    }

    if (req.method === "GET") {
      if (!existsSync(filePath))
        return new Response("Not found", { status: 404 });
      // Only serve tars that have actual output files.
      // Metadata-only tars crash Nx's HttpRemoteCache (ENOENT on scandir).
      if (!hashesWithOutputs.has(hash)) {
        if (!checkHasOutputFiles(filePath)) {
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
