/**
 * `probeWritable` — the pure half, driven entirely over its `FsProbe` seam.
 *
 * Every branch here decides whether a row REPORTS a named skip or attempts a
 * write that fails with a raw fs message, and two of them cannot be arranged
 * for real: a test process running as root can write to a `0o500` directory,
 * and no CI host has a `/nix/store`. So the filesystem is three injected
 * functions and each rule is asserted against a fixture that spells out the
 * machine it stands for.
 */

import { describe, expect, it } from "vitest";
import { type FsProbe, probeWritable, type WriteBlock } from "./writability.js";

/**
 * A fixture filesystem: `present` is the set of paths that exist, `realpath`
 * rewrites a path to what it resolves to, and `denied` is the set of resolved
 * paths that refuse `W_OK`. Every call is recorded so a case can assert the
 * walk itself, not only its answer.
 */
const probe = (spec: {
  present?: readonly string[];
  realpath?: Readonly<Record<string, string>>;
  denied?: readonly string[];
  realpathThrows?: boolean;
}): FsProbe & { seen: string[]; accessed: string[] } => {
  const seen: string[] = [];
  const accessed: string[] = [];
  return {
    seen,
    accessed,
    existsSync: (path) => {
      seen.push(path);
      return (spec.present ?? []).includes(path);
    },
    realpathSync: (path) => {
      if (spec.realpathThrows === true) throw new Error("ELOOP");
      return spec.realpath?.[path] ?? path;
    },
    accessSync: (path) => {
      accessed.push(path);
      if ((spec.denied ?? []).includes(path)) {
        throw new Error("EACCES: permission denied");
      }
    },
  };
};

describe("probeWritable", () => {
  it("probes the TARGET ITSELF when it is present, not only its directory", () => {
    // home-manager symlinks `mcp.json` straight into the store and leaves
    // `User/` writable. Stopping at the parent would call the file writable
    // and then fail on the write.
    const fs = probe({
      present: ["/home/u/.config/Code/User/mcp.json"],
      realpath: {
        "/home/u/.config/Code/User/mcp.json": "/nix/store/abc-vscode/mcp.json",
      },
    });
    expect(probeWritable("/home/u/.config/Code/User/mcp.json", fs)).toEqual({
      kind: "nix-store",
      resolved: "/nix/store/abc-vscode/mcp.json",
    } satisfies WriteBlock);
    expect(fs.seen).toEqual(["/home/u/.config/Code/User/mcp.json"]);
  });

  it("passes a present, writable target", () => {
    const fs = probe({ present: ["/home/u/.vscode/extensions"] });
    expect(probeWritable("/home/u/.vscode/extensions", fs)).toBeUndefined();
    expect(fs.accessed).toEqual(["/home/u/.vscode/extensions"]);
  });

  it("passes an ABSENT target whose directory is writable", () => {
    // The ordinary first run: the extensions dir does not exist yet, and it is
    // writable exactly when the directory that would hold it is.
    const fs = probe({ present: ["/home/u"] });
    expect(probeWritable("/home/u/.vscode/extensions", fs)).toBeUndefined();
    expect(fs.accessed).toEqual(["/home/u"]);
  });

  it("walks up through several missing levels to the nearest existing node", () => {
    const fs = probe({ present: ["/home/u"] });
    expect(
      probeWritable("/home/u/.config/Code/User/mcp.json", fs),
    ).toBeUndefined();
    expect(fs.seen).toEqual([
      "/home/u/.config/Code/User/mcp.json",
      "/home/u/.config/Code/User",
      "/home/u/.config/Code",
      "/home/u/.config",
      "/home/u",
    ]);
  });

  it("follows the symlink: the STORE path is the answer, not the link's own name", () => {
    // `~/.vscode/extensions` → `/nix/store/…`: nothing about the link's name
    // says it is managed, and the raw fs error the write produced said nothing
    // about Nix either.
    const fs = probe({
      present: ["/home/u/.vscode/extensions"],
      realpath: {
        "/home/u/.vscode/extensions": "/nix/store/xyz-vscode-with-extensions",
      },
    });
    expect(probeWritable("/home/u/.vscode/extensions", fs)).toEqual({
      kind: "nix-store",
      resolved: "/nix/store/xyz-vscode-with-extensions",
    } satisfies WriteBlock);
    // W_OK is never consulted — see the next case for why that matters.
    expect(fs.accessed).toEqual([]);
  });

  it("the store wins over W_OK: a store path NEVER reports `read-only`", () => {
    // The store is read-only, so `access(W_OK)` fails there too. Reporting
    // `read-only` would print a permissions remedy at a Nix user — advice that
    // cannot work, and that the next `nixos-rebuild` would undo anyway.
    const fs = probe({
      present: ["/home/u/.vscode/extensions"],
      realpath: { "/home/u/.vscode/extensions": "/nix/store/abc/extensions" },
      denied: ["/nix/store/abc/extensions"],
    });
    expect(probeWritable("/home/u/.vscode/extensions", fs)?.kind).toBe(
      "nix-store",
    );
  });

  it("reports read-only with the RESOLVED path a remedy has to name", () => {
    const fs = probe({
      present: ["/mnt/ro/home/.vscode/extensions"],
      realpath: {
        "/mnt/ro/home/.vscode/extensions": "/mnt/ro/real/extensions",
      },
      denied: ["/mnt/ro/real/extensions"],
    });
    expect(probeWritable("/mnt/ro/home/.vscode/extensions", fs)).toEqual({
      kind: "read-only",
      path: "/mnt/ro/real/extensions",
    } satisfies WriteBlock);
  });

  it("reports read-only for an absent target under a read-only directory", () => {
    const fs = probe({ present: ["/mnt/ro"], denied: ["/mnt/ro"] });
    expect(probeWritable("/mnt/ro/Code/User/mcp.json", fs)).toEqual({
      kind: "read-only",
      path: "/mnt/ro",
    } satisfies WriteBlock);
  });

  it("blocks nothing when the walk runs out of parents", () => {
    // `dirname("/")` is `"/"`, so the walk terminates on the fixed point. With
    // nothing existing anywhere there is no permission answer to give, and
    // inventing one either way would be a guess.
    const fs = probe({});
    expect(probeWritable("/nowhere/at/all", fs)).toBeUndefined();
    expect(fs.seen.at(-1)).toBe("/");
  });

  it("blocks nothing when realpath itself fails — the write is the honest judge", () => {
    // The node existed a moment ago and cannot be resolved now: a race, or a
    // symlink loop. Reporting a skip would be a claim this probe cannot back.
    const fs = probe({
      present: ["/home/u/.vscode/extensions"],
      realpathThrows: true,
    });
    expect(probeWritable("/home/u/.vscode/extensions", fs)).toBeUndefined();
  });

  it("defaults to the real filesystem — a writable temp dir passes", () => {
    // The one case that touches the disk, so the default argument is covered
    // by something other than a fixture claiming to be it.
    expect(probeWritable(process.cwd())).toBeUndefined();
  });
});
