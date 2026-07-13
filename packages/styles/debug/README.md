## Canonical Debugging styles

This package includes a set of canonical debugging styles that can be used to quickly identify and debug issues in your
code.
They are not included in the base styles packages, but can be used in conjunction with them.

### Getting started

1. Install the package: `npm install @canonical/styles-debug`
2. Import the styles you need:

```css
/* CSS Import */
/* To import all styles */
@import url("@canonical/styles-debug");

/* To import only certain styles */
@import url("@canonical/styles-debug/baseline-grid");
```

If using a bundling tool like Vite, you may also directly import the styles in a component file:
```tsx
import "@canonical/styles-debug"; // import all debug styles
// import "@canonical/styles-debug/baseline-grid"; // for baseline grid only
```

### Debug utilities

#### Baseline grid

The baseline grid utility allows you to visualize the baseline grid in your application.
To use it, add the `with-baseline-grid` class to any element.
Each baseline row is painted as an alternating tinted / clear band (rather than a
single hairline), which stays readable at the 4px grid; a stronger solid line is
drawn every Nth baseline so groups can be counted.

##### Customization

This utility can be customized by setting the following CSS variables:

| Variable                       | Description                                            | Default Value                  |
|--------------------------------|--------------------------------------------------------|--------------------------------|
| `--baseline-grid-color`        | Tint of the alternating baseline bands                 | branded border @ 22% (opaque)  |
| `--baseline-grid-major-color`  | Colour of the major (every-Nth) line                   | branded border @ 70% (opaque)  |
| `--baseline-grid-major-every`  | How many baselines between major lines                 | `4`                            |
| `--baseline-height`            | The height of one baseline unit                        | `0.25rem` (4px)                |
| `--baseline-grid-height`       | Fallback baseline height if `--baseline-height` unset  | `0.25rem` (4px)                |
| `--baseline-shift`             | The offset shift of the baseline grid                  | `0`                            |

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