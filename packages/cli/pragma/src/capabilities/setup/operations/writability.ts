/**
 * "Could this command write there?" — asked BEFORE anything is written.
 *
 * Two machines answer no, and until this probe existed both answered it the
 * same wrong way. A NixOS or home-manager user's `~/.vscode/extensions` is a
 * symlink into `/nix/store`, which is a read-only filesystem by design:
 * `--install-extension` failed with a raw fs error, or appeared to succeed and
 * changed nothing. A managed config directory turned the MCP write into a
 * `failed` row carrying an EACCES message and no next step. Neither is a
 * failure of this command — the machine is configured exactly as its owner
 * intends — so both become NAMED SKIPS whose remedy is the one action that
 * works there: declaring the extension, or the MCP entry, in the config that
 * owns the directory.
 *
 * Per the owner, 2026-09-16: the decision is made by the DIRECTORY, never by
 * the OS. Nix is not a platform to branch on — a Nix user's home directory is
 * ordinary, a non-Nix user can have a read-only mount, and `/etc/nixos` says
 * nothing about whether THIS path is writable. So the probe walks the path it
 * was actually given.
 *
 * Three rules, in this order:
 *
 * 1. **Walk up to the nearest node that exists**, starting AT the target. The
 *    target itself when it is there — home-manager symlinks `mcp.json`
 *    directly into the store while leaving `User/` writable, so stopping at
 *    the parent directory would call that file writable and then fail on the
 *    write. Otherwise its nearest existing ancestor, because a path that does
 *    not exist yet is writable exactly when the directory that would hold it
 *    is.
 * 2. **`realpathSync` it**, so the answer is about the real filesystem rather
 *    than the symlink standing in front of it.
 * 3. **`/nix/store/` wins over `W_OK`.** Checked first, deliberately: the
 *    store is read-only, so `access(W_OK)` would fail there too and the row
 *    would report "read-only" with a remedy about file permissions — advice
 *    that cannot work, because `chmod` on the store is not the fix and would
 *    be undone by the next `nixos-rebuild`. The remedy for a store path is a
 *    declaration in the user's own config, and naming the store is what earns
 *    it.
 *
 * The whole filesystem surface is the injected {@link FsProbe}, so every
 * branch is exercised over a seam rather than by arranging a real read-only
 * directory (which a test running as root cannot do at all). It lives under
 * `setup/operations/` because setup is its one consumer: doctor reads the
 * result off the detection records setup already produced, and never probes
 * a second time.
 */

import { accessSync, constants, existsSync, realpathSync } from "node:fs";
import { dirname } from "node:path";

/** The store prefix a Nix-managed path resolves under. */
const NIX_STORE_PREFIX = "/nix/store/";

/**
 * Why a write cannot happen at a path — a fact with a remedy, never an error.
 *
 * The two kinds are kept apart because their remedies are unrelated: a store
 * path needs a DECLARATION in the config that produced it, and a read-only
 * path needs permissions changed (or the same install run by hand against a
 * writable location). Collapsing them to one "not writable" would print the
 * `chmod` advice at a Nix user, which cannot work.
 */
export type WriteBlock =
  | {
      readonly kind: "nix-store";
      /** The store path the target resolves to — the evidence, and the remedy's subject. */
      readonly resolved: string;
    }
  | {
      readonly kind: "read-only";
      /** The existing node that refused `W_OK` — the path a remedy must name. */
      readonly path: string;
    };

/**
 * The filesystem this probe uses — the seam, defaulting to `node:fs`.
 *
 * Narrowed to the three calls, so a fixture is three functions rather than a
 * module mock, and so nothing here can reach a writer by accident.
 */
export interface FsProbe {
  existsSync(path: string): boolean;
  accessSync(path: string, mode?: number): void;
  realpathSync(path: string): string;
}

/** The real filesystem — the default, and the only impure thing in this module. */
const nodeFs: FsProbe = { existsSync, accessSync, realpathSync };

/**
 * The nearest node at or above `target` that exists, or `undefined` when the
 * walk runs out of parents.
 *
 * `dirname("/")` is `"/"`, so the loop terminates on the fixed point rather
 * than on a path shape — the same is true of a win32 drive root, which is why
 * the comparison is against the previous value and not against a separator.
 */
const nearestExisting = (target: string, fs: FsProbe): string | undefined => {
  let current = target;
  for (;;) {
    if (fs.existsSync(current)) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
};

/**
 * Probe whether `target` could be written, returning the {@link WriteBlock}
 * that says why not — or `undefined` when the write can go ahead.
 *
 * @param target - The file or directory a write would create or modify.
 * @param fs - The filesystem seam; defaults to the real `node:fs`.
 * @returns The block, or `undefined` when the path is writable.
 * @note Impure by default — it stats and resolves real paths. Every branch is
 * reachable through the injected {@link FsProbe}.
 */
export function probeWritable(
  target: string,
  fs: FsProbe = nodeFs,
): WriteBlock | undefined {
  const existing = nearestExisting(target, fs);
  // Nothing at or above the target exists. That is not a permission answer,
  // and inventing one either way would be a guess — the write will report its
  // own error if it is really unreachable.
  if (existing === undefined) return undefined;

  let resolved: string;
  try {
    resolved = fs.realpathSync(existing);
  } catch {
    // The node existed a moment ago and cannot be resolved now (a race, or a
    // symlink loop). Not a block: the caller's write is the honest judge.
    return undefined;
  }

  if (resolved.startsWith(NIX_STORE_PREFIX)) {
    return { kind: "nix-store", resolved };
  }

  try {
    fs.accessSync(resolved, constants.W_OK);
  } catch {
    return { kind: "read-only", path: resolved };
  }
  return undefined;
}
