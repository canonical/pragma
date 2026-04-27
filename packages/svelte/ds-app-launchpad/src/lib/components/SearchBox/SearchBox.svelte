<!-- @canonical/generator-ds 0.10.0-experimental.4 -->

<script lang="ts">
  import type { SearchBoxProps } from "./types.js";
  import "./styles.css";
  import { InputPrimitive } from "../common/index.js";
  import { SearchButton } from "./common/index.js";
  import { setSearchBoxContext } from "./context.js";

  const componentCssClassName = "ds search-box";

  let {
    class: className,
    value = $bindable(),
    children,
    "aria-label": ariaLabel,
    disabled,
    shouldRenderInvalidStyles,
    "data-testid": dataTestId,
    ...rest
  }: SearchBoxProps = $props();

  setSearchBoxContext({
    get disabled() {
      return disabled;
    },
    get "aria-label"() {
      return ariaLabel;
    },
  });
</script>

<div class={[componentCssClassName, className]} data-testid={dataTestId}>
  <InputPrimitive
    type="search"
    bind:value
    aria-label={ariaLabel}
    {disabled}
    class={{ "no-invalid-styles": !shouldRenderInvalidStyles }}
    {...rest}
  />
  {#if children}
    {@render children()}
  {:else}
    <SearchButton />
  {/if}
</div>

<!-- @component
`SearchBox` is a text input field designed for search functionality.

By default, it renders an input and a submit button (`SearchBox.SearchButton`).
You can override the default button by passing `children`.

When `SearchBox.SearchButton` is used inside `SearchBox`, it inherits `aria-label` and `disabled` from `SearchBox` context by default. You can still override those values directly on `SearchBox.SearchButton` when needed.

## Example Usage
### Basic Example
```svelte
<SearchBox aria-label="Search articles" placeholder="Ubuntu" />
```

### Customized SearchButton
```svelte
<SearchBox aria-label="Search articles" placeholder="Ubuntu">
  <SearchBox.SearchButton onclick={handleClick} aria-label="Run search" />
</SearchBox>
```

### As a search landmark
To make the `SearchBox` a search landmark wrap it in a [`<form role="search">`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/search_role) or [`<search>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/search)
```svelte
<search>
  <form>
    <SearchBox aria-label="Articles" name="q" />
  </form>
</search>
```
-->
