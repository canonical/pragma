/**
 * The shared answer sets both binaries run their conformance cases from.
 *
 * DATA ONLY — this module imports no generator, by design. summon-core sits
 * BELOW both bins, so reaching up for `@canonical/summon`'s `example/hello` or
 * for pragma's bundled component/package/application generators would invert
 * the dependency direction the whole fold rests on. A fixture therefore names
 * its generator by a logical id and carries the answers; the CONSUMING package
 * resolves that id to a real `GeneratorDefinition` it already owns and hands it
 * to {@link produceReference}.
 *
 * The ids are conventional, not enforced: a consumer covers the ones it ships
 * and ignores the rest, and adds its own fixtures where it has generators no
 * one else does.
 */

/** One conformance case: which generator, and the complete answers for it. */
export interface ConformanceFixture {
  /** Human-readable case name, used in test titles. */
  readonly name: string;
  /** Logical generator id the consuming package resolves (e.g. `component/react`). */
  readonly generator: string;
  /** A COMPLETE answer set — every prompt answered, so no interaction occurs. */
  readonly answers: Readonly<Record<string, unknown>>;
}

/** The answers every component framework shares (the three optional artifacts). */
const COMPONENT_ANSWERS = {
  withStyles: true,
  withStories: true,
  withSsrTests: false,
} as const;

/**
 * The design-system generator fixtures — the seven trees pragma's `create` verbs
 * and summon's `execute` must agree on byte for byte.
 */
export const CONFORMANCE_FIXTURES: readonly ConformanceFixture[] = [
  {
    name: "component/react",
    generator: "component/react",
    answers: { componentPath: "src/components/Button", ...COMPONENT_ANSWERS },
  },
  {
    name: "component/svelte",
    generator: "component/svelte",
    answers: { componentPath: "src/lib/Button", ...COMPONENT_ANSWERS },
  },
  {
    name: "component/lit",
    generator: "component/lit",
    answers: { componentPath: "src/lib/Button", ...COMPONENT_ANSWERS },
  },
  {
    name: "package",
    generator: "package",
    answers: {
      name: "@canonical/my-lib",
      type: "library",
      description: "A library.",
      withReact: false,
      withStorybook: false,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    },
  },
  {
    name: "application",
    generator: "application",
    answers: {
      appPath: "my-app",
      forms: true,
      relay: false,
      runInstall: false,
    },
  },
  {
    // The SPA arm. Nothing else in CI produces a client-only tree, so without
    // this fixture `--rendering spa` would be exercised only by hand: here
    // three independent producers build it and diff it byte for byte.
    name: "application-spa",
    generator: "application",
    answers: {
      appPath: "my-app",
      forms: true,
      intl: false,
      relay: false,
      rendering: "spa",
      runInstall: false,
    },
  },
  {
    // The SPA arm with every feature on. The bare fixture above renders none
    // of the combination-only gates — `relay && spa` (an environment with no
    // payloads to seed), `intl && spa` (negotiation with no server to have
    // done it), the four-way provider stack in the client entry, and the
    // nested intl/spa gates in the e2e template. This one renders all of them.
    name: "application-spa-all",
    generator: "application",
    answers: {
      appPath: "my-app",
      forms: true,
      intl: true,
      relay: true,
      rendering: "spa",
      runInstall: false,
    },
  },
];

/**
 * Look up a fixture by name.
 *
 * @param name - The fixture's {@link ConformanceFixture.name}.
 * @returns The fixture.
 * @throws If no fixture carries that name — a typo must fail loudly rather
 *   than silently skip a conformance case.
 */
export function fixture(name: string): ConformanceFixture {
  const found = CONFORMANCE_FIXTURES.find((entry) => entry.name === name);
  if (!found) throw new Error(`no conformance fixture named "${name}"`);
  return found;
}
