// @vitest-environment node

/**
 * The guard's server half, which is the half that used to be unreachable.
 *
 * `withAuth` runs from the route's asynchronous `warm` hook, and SSR matches
 * and renders synchronously without awaiting it — so a hard `GET /account`
 * rendered the protected page while an in-app navigation to the same URL
 * redirected. The four HTTP entry points now ask `getAuthRedirectHref` before
 * they render, and these are its answers.
 */

import { describe, expect, it } from "vitest";
import { getAuthRedirectHref } from "./authGuard.js";

describe("getAuthRedirectHref", () => {
  it("sends an unauthenticated request for a protected path to the login page", () => {
    expect(getAuthRedirectHref("/account")).toBe("/login?from=%2Faccount");
  });

  it("lets an authenticated request through", () => {
    expect(getAuthRedirectHref("/account?auth=1")).toBeNull();
  });

  it("leaves unprotected paths alone", () => {
    expect(getAuthRedirectHref("/components")).toBeNull();
    expect(getAuthRedirectHref("/")).toBeNull();
  });

  it("reads an absolute URL as well as a path", () => {
    expect(getAuthRedirectHref(new URL("https://docs.example/account"))).toBe(
      "/login?from=%2Faccount",
    );
  });

  it("does not accept an auth value other than the demo one", () => {
    // The credential is `?auth=1` and nothing else — the demo the scaffold
    // ships and the login page documents. Any other value is not a session.
    expect(getAuthRedirectHref("/account?auth=0")).toBe(
      "/login?from=%2Faccount",
    );
    expect(getAuthRedirectHref("/account?auth=true")).toBe(
      "/login?from=%2Faccount",
    );
  });
});
