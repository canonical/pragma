# @canonical/react-ds-app-launchpad

Launchpad-specific components for the Pragma design system. This package provides specialized UI elements for the Launchpad application, including markdown editing, git diff visualization, and file tree navigation.

## Installation

```bash
bun add @canonical/react-ds-app-launchpad
```

The package requires React 19 and builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { MarkdownEditor, GitDiffViewer, FileTree } from "@canonical/react-ds-app-launchpad";

function CodeReview() {
  return (
    <div>
      <FileTree items={files} />
      <GitDiffViewer diff={diffContent} />
      <MarkdownEditor value={comment} onChange={setComment} />
    </div>
  );
}
```

## Storybook

```bash
cd packages/react/ds-app-launchpad
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
