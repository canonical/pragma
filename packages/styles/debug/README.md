## Canonical Debugging styles

This package includes a set of canonical debugging styles that can be used to quickly identify and debug issues in your
code.
They are not included in the base styles packages, but can be used in conjunction with them.

### Getting started

1. Install the package: `npm install @canonical/styles-debug`
2. Import the styles you need:

```css
/* To import all styles */
@import url("@canonical/styles-debug");

/* To import only certain styles */
@import url("@canonical/styles-debug/baseline-grid");
```

### Debug utilities

#### Baseline grid

The baseline grid utility allows you to visualize the baseline grid in your application.
To use it, add the `with-baseline-grid` class to any element.
This will add a background color to the element and its children, allowing you to see the baseline grid in action.

##### Customization

This utility can be customized by setting the following CSS variables:

| Variable                | Description                           | Default Value          |
|-------------------------|---------------------------------------|------------------------|
| `--baseline-grid-color` | The color of the baseline grid lines  | `rgba(255, 0, 0, 0.2)` |
| `--baseline-height`     | The height of the baseline grid       | `0.5rem`               |
| `--baseline-shift`      | The offset shift of the baseline grid | `0`                    |

##### Example

```html
<link rel="stylesheet" href="https://unpkg.com/@canonical/styles-debug/src/baseline-grid.css">
<style>
    :root {
        --baseline-grid-color: teal;
    }
</style>
<div class="with-baseline-grid">
    <p>Some text</p>
    <p>Some more text</p>
</div>
```