import type { DataViewsState, Query } from "@canonical/dataviews-core";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId } from "react";
import { interceptSubmit } from "../../../../utils/index.js";
import { useAppliedSearch, useDataViewsRoot } from "../../hooks/index.js";
import { HiddenQueryFields } from "../HiddenQueryFields/index.js";
import type { DataViewsSearchProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-search";

/** The wire name of the search, which the input submits itself. */
const SEARCH_KEY = "q";

/** The names the form's own control submits. */
const OWN_KEYS: readonly string[] = [SEARCH_KEY];

/**
 * The destination a submission reaches: the applied query less the search
 * the input submits itself, from the first page, as a search command would
 * leave it.
 */
const destinationOf = ({ slice, window }: DataViewsState<object>): Query => ({
  slice: { ...slice, search: null },
  window: { ...window, page: 1, cursor: null },
});

/**
 * The search component serves as the entry point to a search experience,
 * allowing users to quickly find and access content by specifying a word or
 * phrase rather than manually navigating through an interface.
 *
 * That is the design system's description of the block. What this part
 * covers: one labelled native search input over the collection's applied
 * search. Every edit applies as it is typed, through `setSearch`, and a
 * search replaces the history entry rather than pushing one, so typing never
 * floods history and Back restores the applied search into the input. At
 * baseline the input sits in a GET form carrying the rest of the query, so
 * a submission is the destination the provider would have written. It reads
 * the root it is placed in, throws outside one, and throws where the root's
 * source declares no search, as the saved views do without a store: a
 * control nothing can execute is not offered disabled.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @implements ds:global.subcomponent.search_input
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function Search({
  label = "Search",
  className,
  id,
  ...rest
}: DataViewsSearchProps): ReactElement {
  const { provider } = useDataViewsRoot("Search");
  if (provider.capabilities.search === null) {
    throw new Error(
      "DataViews.Search requires a source that declares search; this provider's declares none",
    );
  }
  const applied = useAppliedSearch({ provider });
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    // The `search` element would say this natively, but jsdom and browsers
    // before 2023 do not know it and React warns on every render; the role
    // on the form is the same landmark everywhere.
    // biome-ignore lint/a11y/useSemanticElements: `<search>` is unknown to jsdom and to browsers before 2023
    <form
      method="get"
      role="search"
      className={componentCssClassName}
      onSubmit={interceptSubmit}
    >
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        // The props are the input's, the class name with them; the
        // landmark keeps the component's own.
        className={["input", className].filter(Boolean).join(" ")}
        type="search"
        name={SEARCH_KEY}
        value={applied}
        onChange={(event) => {
          provider.setSearch(event.target.value);
        }}
      />
      <HiddenQueryFields
        provider={provider}
        destinationOf={destinationOf}
        omit={OWN_KEYS}
      />
      <Button type="submit" importance="secondary" className="submit">
        Search
      </Button>
    </form>
  );
}
