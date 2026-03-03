# Vite Plugin Lit CSS

A custom Vite plugin that transforms CSS imports into Lit `CSSResult` objects, enabling separate `.css` files for component styles.

**Based on**: [vite-plugin-lit-css](https://github.com/redfox-mx/vite-lit-css) by [@redfox-mx](https://github.com/redfox-mx)

---

## Purpose

Allows maintaining styles in separate `.css` files instead of inline `css` tagged templates, following Pragma's separation of concerns principle while maintaining full CSS tooling support.

**Without plugin:**
```typescript
class MyComponent extends LitElement {
  static styles = css`.button { background: blue; }`;
}
```

**With plugin:**
```typescript
import styles from './styles.css';

class MyComponent extends LitElement {
  static styles = styles; // CSSResult
}
```

## Usage

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import { litCss } from './vite-plugin-lit-css';

export default defineConfig({
  plugins: [
    litCss({
      exclude: /\.storybook\/.*\.css$/,  // Exclude Storybook CSS
      verbose: false                      // Enable debug logging
    })
  ],
});
```

**TypeScript support** ([css.d.ts](css.d.ts)):

Type declarations for CSS module imports in Lit components.
This allows TypeScript to recognize CSS imports.

```typescript
declare module "*.css" {
  import type { CSSResult } from "lit";
  const styles: CSSResult;
  export default styles;
}
```

## How It Works

The plugin wraps Vite's built-in CSS transformer:

1. Intercepts CSS file imports
2. Adds `?inline` query to get CSS as a string export
3. Calls Vite's CSS transformer (handles minification, imports, etc.)
4. Extracts the CSS string using regex and `JSON.parse()` to properly unescape
5. Wraps in Lit's `css` tagged template

**Transformation:**
```
styles.css → Vite CSS processing → "css string" → css`css string` → CSSResult
```

## Why Custom Implementation?

- **Zero dependencies**: Uses only Vite's built-in utilities
- **Simplified**: Supports only `.css` files (Pragma standard)
- **Maintainability**: Full control over the codebase
- **Compatibility**: Leverages Vite's CSS processing instead of reimplementing it
