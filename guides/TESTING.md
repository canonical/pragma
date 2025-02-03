## Testing Framework: Vitest

We have chosen [Vitest](https://vitest.dev/) as our React testing framework for our design system engineering team. 
This decision is based on its speed, simplicity, and excellent integration with modern JavaScript ecosystems.

### Why Vitest?

1. **Performance**: Vitest offers superior speed, especially in watch mode.
2. **Simplicity**: It provides a straightforward setup, particularly for modern JavaScript projects.
3. **ES Module Support**: Vitest has great native support for ES modules.
4. **Vite Integration**: Vitest offers great integration for Vite projects (which many of our packages are). It is also easy to integrate with projects that don't use Vite.

### Setup and Configuration

#### Installing Vitest
Install Vitest: `bun add -d vitest`

#### Vitest Config (vitest.config.ts)
Create `vitest.config.ts` in the root of a package. The structure of this file varies based on whether your project is using Vite or not.
Example configurations for Vite and non-Vite projects are given below. 
See the [Vitest documentation](https://vitest.dev/config/file.html#managing-vitest-config-file) for more information. 

##### Vite Projects
Define a test configuration in `vitest.config.ts` that merges your main Vite config with the test configuration.
Use `defineConfig` from `vitest/config` to define the test configuration, and `mergeConfig` to merge it with the Vite configuration.
```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  // Base the test config on the base vite config
  viteConfig,
  defineConfig({
    test: {
      // use JS DOM for browser-like test environment
      environment: "jsdom",
      // include vite globals for terser test code
      globals: true,
      include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
    },
  }),
);
````

##### Non-Vite Projects
Define a test configuration in `vitest.config.ts` and export it using `defineConfig` from `vitest/config`. 
```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default defineConfig({
  test: {
    // use JS DOM for browser-like test environment
    environment: "jsdom",
    // include vite globals for terser test code
    globals: true,
    include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
  }
});
```

#### Typescript Configuration (tsconfig.json)
Add Vite globals and your configuration file to your Typescript configuration.
These do not have to be included in your build configuration. They are only necessary for type-checking and testing.
```json5
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```
#### Testing environment

Vitest supports multiple testing environments:
- Node (default)
- JSDom (browser-like environment)
- happy-dom
- edge-runtime

We have chosen to use JSDom as our testing environment for front-end code.
This environment is the most similar to a browser environment, making it ideal for testing components.
You may use other environments based on your needs. See the [Vitest documentation](https://vitest.dev/config/#environment) for more information.

##### Installing a testing environment
If using a non-node testing environment, install the corresponding package: `bun add -d <jsdom|happy-dom|edge-runtime>`.

#### React Testing Library

We've chosen [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to complement Vitest for testing React components. 
This enables us to write tests that are well-suited for React components by directly render components and interacting with them.

##### Why React Testing Library?

1. **User-centric testing**: It promotes testing behavior over implementation.
2. **Simplicity**: Provides a simple and intuitive API for testing React components.
3. **Accessibility**: Encourages writing accessible components by default.

Install React Testing Library: `bun add -d @testing-library/react`

#### Jest-dom (optional)

[Jest-dom](https://www.npmjs.com/package/@testing-library/jest-dom) provides a set of custom element matchers.
These can be used to extend vitest matchers to make it easier to test the state of the DOM.
It is widely used, both [within Canonical](https://github.com/search?q=org%3Acanonical+jest-dom+vitest+%40testing-library%2Freact&type=code) and in the wider community.

Install Jest-dom: `bun add -d @testing-library/jest-dom`

##### Configuring Jest-dom
Create a `vitest.setup.ts` file in the root of your package and import Jest-dom's matchers.
```typescript
// vitest.setup.ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Extends vitest's matchers with jest-dom's matchers
import "@testing-library/jest-dom/vitest";

// Cleanup the DOM after each test
afterEach(() => {
  cleanup();
});
```
Add the setup file to your `vitest.config.ts`:
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default defineConfig({
  setupFiles: ["./vitest.setup.ts"],
  // the rest of your config options...
});
````
Finally, add the setup file to your `tsconfig.json` to enable type-checking it.
```json5
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "vitest/globals",
      "@testing-library/jest-dom"
    ]
  },
  "include": [
    "vite.config.ts", 
    "vitest.config.ts", 
    "vitest.setup.ts"
  ]
}
```
#### Writing Tests

Vitest provides a simple and intuitive API for writing tests.
Tests should be written to target specific components or features, ensuring that they are isolated and focused.

Components should be tested based on their behavior, not their implementation details.
This can be done by targeting elements by their text content, role, or other accessible attributes, instead of their structure.

An example is provided that covers many common testing scenarios:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Component from "./Chip.js";

describe("Chip component", () => {
  // Test basic rendering
  it("renders", () => {
    render(<Component lead={"Cloud"} value={"AWS"}/>);
    expect(screen.getByText("AWS")).toBeInTheDocument();
  });

  // Test passing in props and nesting elements
  it("applies lead & value", () => {
    render(<Component lead={"Cloud"} value={"AWS"}/>);
    const leadElement = screen.getByText("Cloud");
    const valueElement = screen.getByText("AWS");

    const chipElement = leadElement.closest(".ds.chip");
    expect(chipElement).toBeInTheDocument();
    expect(chipElement).toContainElement(leadElement);
    expect(chipElement).toContainElement(valueElement);
  });

  // Test CSS classes
  it("applies positive appearance", () => {
    render(<Component lead="Cloud" value="AWS" appearance="positive"/>);

    const leadElement = screen.getByText("Cloud");
    const chipElement = leadElement.closest(".ds.chip");

    expect(chipElement).toHaveClass("positive");
  });

  // Test event handling
  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<Component lead={"Cloud"} value={"AWS"} onClick={onClick}/>);
    screen.getByText("AWS").click();
    expect(onClick).toHaveBeenCalled();
  });
});
```
