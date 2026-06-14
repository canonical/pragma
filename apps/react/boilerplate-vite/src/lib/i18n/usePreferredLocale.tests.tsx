import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import usePreferredLocale from "./usePreferredLocale.js";

function setNavigatorLanguages(languages: string[]) {
  Object.defineProperty(navigator, "languages", {
    value: languages,
    configurable: true,
  });
  Object.defineProperty(navigator, "language", {
    value: languages[0],
    configurable: true,
  });
}

beforeEach(() => {
  setNavigatorLanguages(["en-US", "en"]);
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup
  document.cookie = "locale=; max-age=0";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("usePreferredLocale", () => {
  it("follows the best supported browser language by default", () => {
    setNavigatorLanguages(["fr-CA", "fr", "en"]);
    const { result } = renderHook(() => usePreferredLocale());
    expect(result.current.value).toBe("fr");
    expect(result.current.source).toBe("system");
  });

  it("falls back to the default when no browser language is supported", () => {
    setNavigatorLanguages(["pt-BR", "ja"]);
    const { result } = renderHook(() => usePreferredLocale());
    expect(result.current.value).toBe("en");
  });

  it("reads an explicit choice from the cookie", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "locale=de";
    const { result } = renderHook(() => usePreferredLocale());
    expect(result.current.value).toBe("de");
    expect(result.current.source).toBe("stored");
  });

  it("uses initialValue for SSR hydration when no cookie is present", () => {
    setNavigatorLanguages(["en"]);
    const { result } = renderHook(() =>
      usePreferredLocale({ initialValue: "es" }),
    );
    expect(result.current.value).toBe("es");
    expect(result.current.source).toBe("system");
  });

  it("persists a cookie and reflects lang/dir on set", () => {
    const { result } = renderHook(() => usePreferredLocale());

    act(() => {
      result.current.set("ar");
    });

    expect(result.current.value).toBe("ar");
    expect(result.current.source).toBe("stored");
    expect(result.current.dir).toBe("rtl");
    expect(document.cookie).toContain("locale=ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("clears the cookie and reverts to the browser language on reset", () => {
    setNavigatorLanguages(["fr"]);
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "locale=de";
    const { result } = renderHook(() => usePreferredLocale());
    expect(result.current.value).toBe("de");

    act(() => {
      result.current.reset();
    });

    expect(result.current.source).toBe("system");
    expect(result.current.value).toBe("fr");
  });
});
