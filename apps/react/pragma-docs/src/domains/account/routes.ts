import type { StandardSchemaV1 } from "@canonical/router-core";
import { route } from "@canonical/router-core";
import AccountPage from "./AccountPage.js";
import LoginPage from "./LoginPage.js";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * A Standard Schema v1 validator over a route's search params.
 *
 * Hand-rolled rather than taken from a validation library, because these two
 * schemas read one optional string each and the app carries no such
 * dependency. The SHAPE, however, is the specification's and is not
 * negotiable: `version` and `vendor` are how any consumer recognises the
 * object as a Standard Schema at all, and `validate` must answer with a
 * RESULT — `{ value }` or `{ issues }` — rather than with the parsed value.
 *
 * An earlier version of this file omitted all three. It typechecked against a
 * router that did not yet assert the contract, and stopped typechecking when
 * one did: a validator the runtime could never actually have called was being
 * accepted at compile time. Reading it back, `search` on both routes had
 * inferred as `never`, which is why a `Link` passing `search` to either was
 * rejected too — the same defect, one hop downstream.
 */
const searchSchema = <TOutput>(
  parse: (record: Record<string, unknown>) => TOutput,
): StandardSchemaV1<unknown, TOutput> => ({
  "~standard": {
    version: 1,
    vendor: "pragma-docs",
    validate: (value: unknown) => ({
      value: parse((value ?? {}) as Record<string, unknown>),
    }),
  },
});

const accountSearchSchema = searchSchema((record) => ({
  auth: readString(record.auth),
}));

const loginSearchSchema = searchSchema((record) => ({
  from: readString(record.from),
}));

const routes = {
  account: route({
    url: "/account",
    search: accountSearchSchema,
    content: AccountPage,
  }),
  login: route({
    url: "/login",
    search: loginSearchSchema,
    content: LoginPage,
  }),
} as const;

export default routes;
