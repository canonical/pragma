# Canonical Typescript Configuration

This package provides a reusable configuration factory for Canonical's Storybook projects.

This package, at the moment, solely exports the shared config. We might in the future, leverage the factory pattern to provide more customization.

## Getting Started
1. In your `.storybook/main.ts` file, replace the contents by 

```typescript 
import { createConfig } from "@canonical/storybook-config";

import { dirname, join } from "node:path";

function getAbsolutePath(value: string): string {
	return dirname(require.resolve(join(value, "package.json")));
}

const config = createConfig(getAbsolutePath);

export default { ...config };
```


