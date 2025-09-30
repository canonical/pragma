# CSS Standards Reference

This document outlines the standards and conventions for writing CSS within the Canonical Design System. It is intended as a reference guide to ensure consistency, maintainability, and scalability of the styles.

## File Organization and Structure (`styles/file-structure`)

### File Naming (`styles/file-structure/file-naming`)
- Component-specific styles shall be located in a file named `styles.css` within their respective component's directory.
  *Example:* `src/ui/Button/styles.css`

### Global Styles (`styles/file-structure/global`)
- A root `index.css` file (e.g., `src/index.css`) is used to:
  - Import foundational style sheets (e.g., `@import url("@canonical/styles");`).
  - Define global CSS custom properties within the `:root` selector.

### Source Order (`styles/file-structure/source-order`)
Component `styles.css` files shall generally follow this order:

1. **Component Variables Block**: A clearly marked block declaring and detailing the CSS custom properties available for that component. Each variable name shall follow the [CTI naming convention](https://github.com/amzn/style-dictionary/blob/86c2c30ba289121f7dc9c28f573d1996dbc4a3a8/README.md#categorytypeitem-structure).
    ```css
    /** background color for the overlay behind the drawer */
    --drawer-overlay-background: rgba(0, 0, 0, 0.5);
    /** opacity of the overlay when the drawer is closed */
    --drawer-overlay-opacity-closed: 0;
    /** opacity of the overlay when the drawer is open */
    --drawer-overlay-opacity-open: 1;
    ```
2. **Base Component Styles**: The primary rule for the component using its designated class (e.g., `.ds.drawer`). `ds` is a design system-wide namespace that allows for easy identification of component classes, and helps to avoid conflicts with other systems. 
3. **Child Element Styles**: Styles for elements that are direct children or integral parts of the component, typically using child (`>`) selectors prefixed with the component class.
4. **Variant/Appearance (mode) Styles**: Styles for different visual appearances of the component, often applied via additional classes.
5. **State Styles**: Styles for interactive states like `:hover`, `:active`, `:focus`, and accessibility states like `[aria-hidden="true"]`.
6. **Pseudo-element Styles**: Styles for `::before` and `::after` pseudo-elements used for UI enhancements.

## Modifiers (`styles/modifiers`)

Modifiers are one of our core styling patterns. Any entity in the design system may consume one or many "modifier families", which are groups of related modifiers that can be applied to change the appearance or behavior of a component.

An modifier family is associated with one or many CSS variables, which are applied to an element and its descendants. 
This allows contextual styling to be easily applied to an entire section of the interface, and provides a level of customizability
above design tokens. 

Modifiers within the same modifier family all provide the same CSS variables, but may have different values.
Components consuming a modifier family must consume all of its modifiers (partial modifier family consumption is not allowed).

### Style Binding (`styles/modifiers/binding`)
Most CSS variables should be bound to variables using a series of fallbacks
  ```css
  /* Button component example */
  color: var(--modifier-color-text, var(--button-color-text));
  background-color: var(--modifier-color, var(--button-color-background));

  /* Tooltip component example with an additional global fallback */
  color: var(
    --modifier-color-text,
    var(--tooltip-color-text, var(--color-text-default)) /* Global default if component/intent specific not set */
  );
  ```


## CSS Class Naming Conventions (`styles/class-naming`)

### Design System Prefix (`styles/class-naming/ds-prefix`)
- All component-specific classes must be prefixed with `ds` to namespace them under the Design System.

### Component Base Class (`styles/class-naming/base-class`)
- Each component has a base class composed of the `ds` prefix and the component's name.
- *Example:*
  - Button: `.ds.button`
  - Chip: `.ds.chip`
  - Tooltip: `.ds.tooltip`

### Modifier and Variant Classes (`styles/class-naming/modifier-variant-classes`)
- Variations in appearance or state are applied by adding modifier classes directly to the component's element alongside the base class.
  *Example:*
  * A tooltip positioned at the top: `.ds.tooltip.top`
  * A button with "positive" appearance might have a class `.positive` (dynamically added based on props).
  * An autofitting tooltip: `.ds.tooltip.autofit`

### Child Element Classes (`styles/class-naming/child-elements`)
- Internal structural elements within a component shall be styled using their own classes, or selected relative to the parent component class, using the direct child selector (`>`). This helps to avoid overly broad selectors that could unintentionally affect other components.
- Internal elements or more specific selectors shall be created using CSS nesting. This helps to keep the styles organized and maintainable.

*Example*:
```css
.ds.button {
    /** variables, base styles, etc. */
    & > .positive {
        color: var(--color-button-positive);
    }
}
```

## CSS Custom Properties / Variables (`styles/custom-properties`)

### Purpose and Usage (`styles/custom-properties/purpose-and-usage`)
- Custom properties are the primary method for enabling theming and customization.
- Primitives and theme variables are provided by the [tokens package](../../packages/tokens).
  - Generally, most of a component's variables shall be mappings to tokens to ensure consistency and maintain the tokens package's ability to effect global changes.
  - Values that are especially simple (like setting opacity to 0 when hidden) may be hard-coded.

### Naming Conventions (`styles/custom-properties/naming`)
All variables follow [CTI naming convention](https://github.com/amzn/style-dictionary/blob/86c2c30ba289121f7dc9c28f573d1996dbc4a3a8/README.md#categorytypeitem-structure).

- **Global Variables**: Defined in `:root` (e.g., `--baseline-grid-color`, `--color-text-default`).
- **Component-Specific Variables**:
  - Convention: `--<component-name>-<property-group>-<specific-property>`
  - Example: `--button-color-background`, `--chip-border-radius`, `--tooltip-font-size`.
- **Intent Variables**: Semantic variables used for theming based on purpose (e.g., positive, negative, information). These allow components to adapt to a contextual theme.
  - Convention: `--modifier-<property>-<variant/state>`
  - Examples:
    - `--modifier-color`
    - `--modifier-color-text`
    - `--modifier-color-border`
    - `--modifier-color-hover`
    - `--modifier-color-active`
    - `--modifier-color-text-tinted` (for subtle variations)
    - `--modifier-color-tinted-hover`
