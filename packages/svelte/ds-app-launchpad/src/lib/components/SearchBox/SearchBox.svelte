<!-- @canonical/generator-ds 0.10.0-experimental.4 -->

<script lang="ts">
  import { SearchIcon } from "@canonical/svelte-icons";
  import type { SearchBoxProps } from "./types.js";
  import "./styles.css";
  import { ButtonPrimitive, InputPrimitive } from "../common/index.js";

  const componentCssClassName = "ds search-box";

  let {
    class: className,
    value = $bindable(),
    "aria-label": ariaLabel,
    disabled,
    invalidStyled,
    onSearchButtonClick,
    "data-testid": dataTestId,
    ...rest
  }: SearchBoxProps = $props();
</script>

<div class={[componentCssClassName, className]} data-testid={dataTestId}>
  <InputPrimitive
    type="search"
    bind:value
    aria-label={ariaLabel}
    {disabled}
    class={{ "no-invalid-styles": !invalidStyled }}
    {...rest}
  />
  <ButtonPrimitive
    type="submit"
    aria-label={ariaLabel}
    {disabled}
    onclick={onSearchButtonClick}
  >
    <SearchIcon />
  </ButtonPrimitive>
</div>

<!-- @component
`SearchBox` is a text input field designed for search functionality. It includes a text input and a submit button.

If the `SearchBox` is used within a form, it will be submitted when the button is clicked or when the user presses the Enter key while focused on the input. If not used within a form, you can provide an `onSearchButtonClick` handler to define custom behavior for the button interaction or `onkeydown` on the input for handling Enter key presses.

## Example Usage
### Basic Example
```svelte
<SearchBox aria-label="Search articles" placeholder="Ubuntu" onSearchButtonClick={handleClick} onkeydown={handleKeyDown} />
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
