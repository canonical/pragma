import fs from "node:fs";
import path from "node:path";

/** True when the path ends in a file extension (e.g. `.txt`, `.ico`, `.js`). */
function hasExtension(pathname: string): boolean {
  return /\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Resolve a request to a static file under `dir`, or `null` to fall through to
 * SSR.
 *
 * Only requests that carry a file extension are treated as static
 * (`/robots.txt`, `/favicon.ico`, `/assets/app-[hash].js`); extensionless paths
 * (`/`, `/contact`) are page routes and are server-rendered. The resolved path
 * is constrained to `dir` so a crafted `..` cannot escape it.
 *
 * @param pathname - The request pathname (no query string).
 * @param dir - The directory static files are served from (e.g. `dist/client`).
 * @returns The absolute file path to serve, or `null`.
 */
export function resolveStaticPath(
  pathname: string,
  dir: string,
): string | null {
  if (!hasExtension(pathname)) return null;

  const root = path.resolve(dir);
  const resolved = path.resolve(root, `.${pathname}`);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;

  return fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : null;
}

/** Map a file extension to a `Content-Type`, defaulting to octet-stream. */
export function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
  };
  return types[ext] ?? "application/octet-stream";
}
