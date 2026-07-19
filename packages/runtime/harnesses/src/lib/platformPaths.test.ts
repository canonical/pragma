import { describe, expect, it } from "vitest";
import {
  detectWsl,
  type PlatformEnv,
  type PlatformId,
  userConfigBase,
  userDataBase,
  userHome,
  windowsHostUserBase,
} from "./platformPaths.js";

/** Build a {@link PlatformEnv} fixture, overriding only the fields under test. */
const platform = (overrides: Partial<PlatformEnv> = {}): PlatformEnv => ({
  platform: "linux" as PlatformId,
  env: {},
  home: "/home/tester",
  isWsl: false,
  ...overrides,
});

describe("detectWsl", () => {
  it("returns true when WSL_DISTRO_NAME is set (no /proc read)", () => {
    let read = false;
    const result = detectWsl({ WSL_DISTRO_NAME: "Ubuntu" }, () => {
      read = true;
      return "";
    });
    expect(result).toBe(true);
    expect(read).toBe(false);
  });

  it("returns true when WSL_INTEROP is set", () => {
    expect(detectWsl({ WSL_INTEROP: "/run/WSL/1" }, () => "")).toBe(true);
  });

  it("returns true when /proc/version carries the microsoft signature", () => {
    expect(
      detectWsl({}, () => "Linux version 5.15.0-microsoft-standard-WSL2"),
    ).toBe(true);
  });

  it("returns false on a native linux kernel version", () => {
    expect(detectWsl({}, () => "Linux version 6.1.0-generic")).toBe(false);
  });
});

describe("userHome", () => {
  it("returns the captured home directory", () => {
    expect(userHome(platform({ home: "/Users/ada" }))).toBe("/Users/ada");
  });
});

describe("userConfigBase", () => {
  it("uses $XDG_CONFIG_HOME on linux when set", () => {
    expect(
      userConfigBase(platform({ env: { XDG_CONFIG_HOME: "/xdg/config" } })),
    ).toBe("/xdg/config");
  });

  it("falls back to ~/.config on linux when XDG is unset", () => {
    expect(userConfigBase(platform())).toBe("/home/tester/.config");
  });

  it("uses ~/Library/Application Support on darwin", () => {
    expect(
      userConfigBase(platform({ platform: "darwin", home: "/Users/ada" })),
    ).toBe("/Users/ada/Library/Application Support");
  });

  it("uses %APPDATA% on win32 when set", () => {
    expect(
      userConfigBase(
        platform({
          platform: "win32",
          home: "C:/Users/Ada",
          env: { APPDATA: "C:/Users/Ada/AppData/Roaming" },
        }),
      ),
    ).toBe("C:/Users/Ada/AppData/Roaming");
  });

  it("falls back to ~/AppData/Roaming on win32 when APPDATA is unset", () => {
    expect(
      userConfigBase(platform({ platform: "win32", home: "C:/Users/Ada" })),
    ).toBe("C:/Users/Ada/AppData/Roaming");
  });
});

describe("userDataBase", () => {
  it("uses $XDG_DATA_HOME on linux when set", () => {
    expect(
      userDataBase(platform({ env: { XDG_DATA_HOME: "/xdg/data" } })),
    ).toBe("/xdg/data");
  });

  it("falls back to ~/.local/share on linux when XDG is unset", () => {
    expect(userDataBase(platform())).toBe("/home/tester/.local/share");
  });

  it("uses ~/Library/Application Support on darwin", () => {
    expect(
      userDataBase(platform({ platform: "darwin", home: "/Users/ada" })),
    ).toBe("/Users/ada/Library/Application Support");
  });

  it("uses %LOCALAPPDATA% on win32 when set", () => {
    expect(
      userDataBase(
        platform({
          platform: "win32",
          home: "C:/Users/Ada",
          env: { LOCALAPPDATA: "C:/Users/Ada/AppData/Local" },
        }),
      ),
    ).toBe("C:/Users/Ada/AppData/Local");
  });

  it("falls back to ~/AppData/Local on win32 when LOCALAPPDATA is unset", () => {
    expect(
      userDataBase(platform({ platform: "win32", home: "C:/Users/Ada" })),
    ).toBe("C:/Users/Ada/AppData/Local");
  });
});

describe("windowsHostUserBase", () => {
  it("returns null when not under WSL", () => {
    expect(windowsHostUserBase(platform({ isWsl: false }))).toBeNull();
  });

  it("resolves /mnt/c/Users/<user> under WSL with $USER set", () => {
    expect(
      windowsHostUserBase(platform({ isWsl: true, env: { USER: "ada" } })),
    ).toBe("/mnt/c/Users/ada");
  });

  it("returns null under WSL when $USER is unset", () => {
    expect(windowsHostUserBase(platform({ isWsl: true }))).toBeNull();
  });
});
