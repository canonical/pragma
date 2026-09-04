/**
 * Every story renders without erroring.
 *
 * WHY THIS EXISTS. The app ships 29 `*.stories.tsx` files and, until this
 * gate, nothing executed any of them. `@storybook/addon-vitest` is registered
 * in the shared Storybook config but the app declares no `storybookTest`
 * project, and no Chromatic workflow exists for this app — so the stories were
 * rendered in CI by nothing at all, free to rot against the components they
 * document, with `tsc` catching only the subset of breakage that is a type
 * error.
 *
 * WHY IT AWAITS, AND WHY A BARE `.not.toThrow()` WOULD BE WORTHLESS HERE. Every
 * page component wraps its content in an `ErrorBoundary`, so a story whose
 * query throws does NOT throw to the caller: the boundary catches it and
 * renders a fallback, and a `.not.toThrow()` assertion passes on exactly the
 * failure the gate exists to catch. React hands the caught error to
 * `onCaughtError` first, which is the one hook that sees it whatever the
 * boundary chooses to render — so that, not the absence of a throw, is what
 * is asserted. `render()` is also synchronous while the relay addon resolves
 * asynchronously, so each story is loaded and then waited on rather than
 * asserted on the first commit.
 *
 * 🔴 THE LIMIT THAT REMAINS. A story that renders its Suspense fallback and
 * never settles past it still passes: the fallback is content (`<p>Loading…</p>`
 * in most lenses), so "committed something" cannot tell it from the real
 * thing, and there is no generic way to name every lens's loading state. So
 * this gate proves a story RENDERS AND DOES NOT ERROR. It does not prove the
 * story reached its data. Closing that needs per-story expectations, which is
 * the Storybook runner's job and is what a `storybookTest` project or
 * Chromatic would do properly.
 *
 * That limit used to cost the gate its ERROR half too, not just its data half.
 * `Story.load()` runs the loaders; it does not settle Relay work, because the
 * relay decorator starts its requests during RENDER
 * (`packages/storybook/addon-relay/src/lib/withRelayEnvironment.tsx`). A query
 * that rejects therefore reaches the error boundary a turn or two after the
 * first commit — after `caught` had been read and cleanup begun — so a story
 * that errored could pass. Each render now yields a full macrotask before the
 * assertion, which is enough for work already queued to land. It is a settle,
 * not a completion signal: a story that would error only after a real network
 * round trip is still outside what this gate can see.
 *
 * WHAT IT IS NOT. This is jsdom and Storybook's portable-stories composition,
 * not the Storybook runner in a browser: layout, the preview head's sizing
 * rules, and the addons whose preview entries are not loaded below all differ.
 * It is the floor underneath a visual review, not a substitute for one.
 *
 * The set is DISCOVERED, never listed: `import.meta.glob` over the whole `src`
 * tree, eagerly. A hand-maintained list is how a story stops being covered
 * without anyone deciding that it should.
 */

import "../../domains/lenses/definitions/__fixtures__/stubReactFlowGlobals.js";
import * as relayAddonAnnotations from "@canonical/storybook-addon-relay/preview";
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { act, render, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import * as previewAnnotations from "../../../.storybook/preview.js";

// The project's preview annotations plus the ONE registered addon that ships a
// preview entry this gate needs. Storybook's runtime loads every addon's
// preview entry; `composeStories` loads none, so a story relying on
// `parameters.relay` would compose without the mock environment that decorator
// supplies. The other registered addons (docs, a11y, vitest, chromatic, utils,
// shell-theme) contribute decorators this gate does not apply — which is part
// of why a green here is a floor and not a visual review.
setProjectAnnotations([relayAddonAnnotations, previewAnnotations]);

/** Every story module in the app, eagerly imported. */
const storyModules = import.meta.glob<Record<string, unknown>>(
  "../../**/*.stories.tsx",
  { eager: true },
);

const modulePaths = Object.keys(storyModules).sort();

/**
 * `composeStories` types its result off the module's own exports, which a
 * generic walk cannot know statically; every value in it is a renderable
 * component carrying a `load()` for the story's loaders.
 */
type ComposedStory = ComponentType & { load: () => Promise<void> };

const composedByPath = new Map<string, Record<string, ComposedStory>>(
  modulePaths.map((path) => [
    path,
    composeStories(
      storyModules[path] as Parameters<typeof composeStories>[0],
    ) as unknown as Record<string, ComposedStory>,
  ]),
);

/**
 * Modules documented by their meta alone, with no stories.
 *
 * An ALLOWLIST rather than a tag test: `tags: ["autodocs"]` is set project-wide
 * by `@canonical/storybook-config`, so testing for it would exempt every
 * module in the app rather than the one that means it. An entry here shows up
 * in a diff and someone has to defend it.
 */
const DOCS_ONLY = new Set([
  "../../addons/journeys/JourneysPage/JourneysPage.stories.tsx",
]);

describe("the story corpus", () => {
  it("is discovered from the tree, and has not shrunk", () => {
    expect(modulePaths.length).toBeGreaterThanOrEqual(29);
  });

  it("composes to stories, and has not silently stopped", () => {
    // The module floor above counts FILES. If a rename or an API change made
    // `composeStories` stop recognising story exports, all 29 files would
    // still be on disk and the render loop would iterate zero times — the
    // suite would go green having rendered nothing. This is the floor that
    // notices.
    const total = [...composedByPath.values()].reduce(
      (count, composed) => count + Object.keys(composed).length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(54);
  });

  it("carries no allowlist entry for a module that is not in the tree", () => {
    // The third way an exemption rots: the module it names is renamed or
    // deleted and the entry outlives it, exempting nothing and reading as
    // though it still does.
    expect(
      [...DOCS_ONLY].filter((path) => !modulePaths.includes(path)),
    ).toEqual([]);
  });
});

describe("every story", () => {
  for (const path of modulePaths) {
    describe(path, () => {
      const composed = composedByPath.get(path) ?? {};
      const names = Object.keys(composed);

      // The allowlist is an EQUIVALENCE, checked in both directions. Only
      // asserting that a story-less module is listed lets an entry go stale
      // the moment its module gains a story — and once it is stale, deleting
      // that story again is silently accepted, which is the exemption doing
      // the opposite of its job. Listed must mean story-less, and story-less
      // must mean listed.
      if (names.length === 0) {
        it("is on the docs-only allowlist", () => {
          expect(DOCS_ONLY).toContain(path);
        });
      } else {
        it("is not on the docs-only allowlist", () => {
          expect(DOCS_ONLY).not.toContain(path);
        });
      }

      for (const name of names) {
        it(`renders: ${name}`, async () => {
          const Story = composed[name];
          if (Story === undefined) {
            throw new Error(`${path}: ${name} composed to undefined`);
          }
          // Every page component wraps its content in an ErrorBoundary, so a
          // story whose query throws renders the fallback and the throw never
          // reaches the caller. React hands the caught error to
          // `onCaughtError` before that happens, which is the one hook that
          // sees it whatever the boundary chooses to render.
          const caught: Error[] = [];
          await Story.load();
          const { container } = render(<Story />, {
            onCaughtError: (error: unknown) => {
              caught.push(
                error instanceof Error ? error : new Error(String(error)),
              );
            },
          });
          await waitFor(() => {
            expect(container).not.toBeEmptyDOMElement();
          });
          // The first commit is not the last word. Most lenses render
          // `<p>Loading…</p>` as their Suspense fallback, so the wait above is
          // satisfied by a story that has not begun to resolve — and the relay
          // decorator starts its requests during render, so a rejected query
          // reaches the error boundary on a later turn. Yield a whole
          // macrotask, so anything already queued settles into `caught` before
          // it is read rather than after cleanup has started.
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
          });
          expect(caught.map((error) => error.message)).toEqual([]);
        });
      }
    });
  }
});
