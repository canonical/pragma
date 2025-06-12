# Storybook Addon DS Baseline Grid

Displays the baseline grid overlay in the Storybook preview.

## Usage 

### Installation

```bash
npm install @canonical/storybook-addon-baseline-grid
```

In your `.storybook/main.js` file, add the following:

```js
module.exports = {
  addons: ['@canonical/storybook-addon-baseline-grid'],
};
```

Please note that this addon does rely on ESM only and does not have a cjs build at all. This means you need a version of node >= 20 and a modern browser to use it.

### Configuration

By default the baseline uses defaults for the following css variables:

```css
:root {
  --baseline-grid-color: rgba(255, 0, 0, 0.2);
  --baseline-height: .5rem;
}
```

By providing yours in `:root` you can override these defaults, for instance 

```css
:root {
  --baseline-grid-color: rgba(0, 0, 255, 0.2);
  --baseline-height: 1rem;
}
```

## Development

- `bun run start` runs babel in watch mode and starts Storybook
- `bun run build` builds and packages the addon

### Addon implementation

The addon logic lives mostly in following files:

- `src/components/Tool.tsx` - component that renders the addon button in the toolbar and toggles the global variable that enables the baseline grid overlay
- `src/withBaselineGrid.ts` - decorator that adds a `with-baseline-grid` CSS class name to the story based on global state The grid look is an internally defined css class that is added to the story preview iframe, and defined in this file.
- `/src/manager.tsx` - registers the addon with Storybook manager and handles in what state of Storybook addon is enabled
- `/src/preview.tsx` - registers the decorator with Storybook preview

### Storybook Addon Kit README

This addon was created using the Storybook Addon Kit.

Check the [full README generated](ADDON_KIT_README.md) by Addon Kit for more information. We will update this README with proper docs in future.
