// Combobox tests are blocked by ResetButton importing Button from
// @canonical/react-ds-global, which fails to resolve in vitest.
// TODO: fix once ds-global exports are resolvable in test environment.

import { describe, expect, it } from "vitest";

describe("Combobox", () => {
  it.todo("renders an input (blocked: ds-global resolution)");
  it.todo("shows options when typing");
  it.todo("supports disabled state");
  it.todo("multiple mode renders an input");
});
