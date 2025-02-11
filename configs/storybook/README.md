# Canonical Storybook Configuration

This package provides a reusable configuration factory for Canonical's Storybook projects.

This package, at the moment, solely exports the shared config. We might in the future, leverage the factory pattern to provide more customization.

## Getting Started
1. In your React Storybook project, install this package with `bun add @canonical/storybook-config`
2. Replace the contents of `.storybook/main.ts` by 

```typescript 
import { createConfig } from "@canonical/storybook-config";

import { dirname, join } from "node:path";

function getAbsolutePath(value: string): string {
	return dirname(require.resolve(join(value, "package.json")));
}

const config = createConfig(getAbsolutePath);

/* Otherwise leads to a TS error "CSF Parsing error: Expected 'ObjectExpression' but found 'CallExpression' instead in 'CallExpression'."
 * https://github.com/storybookjs/storybook/issues/26778#issuecomment-2584041985
 */
export default { ...config };
```
