## Creating a React Component

### 1  Goals
This document will guide you through the process of creating a new React component in the design system, and familiarize you
with our folder structure and naming conventions.

### 2 Reference Material
Our reference documentation is not necessary reading for this guide, but readers who are curious to read about the standards
this guide fulfills may read the following relevant reference documents:
- [Standards for code](../references/STANDARDS_FOR_CODE.md)
- [Standards for React](../references/STANDARDS_FOR_REACT.md)
- [Standards for Styling](../references/STANDARDS_FOR_STYLING.md)
- [Standards for Testing](../references/STANDARDS_FOR_TESTING.md)

### 3 Getting started
1. Select a tier. For example, the core tier packages are located in [`packages/react/ds-core`](../../packages/react/ds-core) and [`packages/react/ds-core-form`](../../packages/react/ds-core-form).
2. Navigate to the `src/ui` folder of the selected tier.
3. Follow the [generator documentation](../../packages/generator-ds/src/component/README.md) to generate starting files for your component. For the sake of this example, we will assume you have invoked `yo @canonical/ds:component Button --withStyles --withStories`.
4. Your Button folder should now contain the following files:
```
   Button
   ├── Button.stories.tsx   # Storybook stories
   ├── Button.tests.tsx     # Vitest tests
   ├── Button.tsx           # Component implementation
   ├── index.ts             # Re-export file
   ├── styles.css           # CSS styles
   └── types.ts             # Types (primarily props)
```
5. Start Storybook by running the following command from the root of the package:
```bash
bun run storybook
```
6. Open the [storybook docs](http://localhost:6006/?path=/docs/button--docs) for your new component You should see that a component with our [standard React props](../references/STANDARDS_FOR_REACT.md#standard-base-props-reactplaceholder-pathbase) has been generated. A "Docs" page contains high-level information about the component, a reference table of all of its props, and embeds each of the component's stories.
![A screenshot of a Storybook project showing a starter "Button" component's documentation. An example of the component is rendered in a "Default" story, which is a simple line of text reading "Hello world!".](../assets/react-component-storybook-default.png)

7. Edit the component files as needed to implement your desired functionality.

### 4 Subcomponents
In some cases, you may wish to split large components into a primary component and multiple subcomponents that are 
only meant to be used inside the primary component. Subcomponents are a great way to achieve this while keeping your code organized.
To create a subcomponent, follow the following steps:

1. Create a folder `common` inside a component's directory. 
2. Set your active directory to `common`. 
3. Use the generator as in step #3 of the [getting started section](#getting-started) to generate a subcomponent. Per the [React standards](../references/STANDARDS_FOR_REACT.md#subcomponents-location-reactfile-structuresubcomponents), subcomponent names should not be prefixed with their parent component name. For example, if your parent component is called `Button`, you might name a subcomponent `Icon` instead of `ButtonIcon`.
4. The generator should create `common/index.ts` which re-exports each subcomponent. This will the top-level component (or other subcomponents) to import subcomponents from `common/index.js`. If you would also like to expose the subcomponents outside of the component, you can either re-export `common/index.js` from `index.ts`, or re-export only the subcomponents that you'd like to expose.

### 5 State
As noted in the [React standards](../references/STANDARDS_FOR_REACT.md#state-management-reactstate), we recommend that React component
files themselves be kept as stateless as possible for optimal readability and usability. 
If your component needs to hold or manage state, we recommend delegating this to custom hooks or context providers, invoking the hooks/context providers in the component file, and binding the resulting state to the component's JSX.

The [Drawer](../../apps/react/demo/src/ui/Drawer/Drawer.tsx) component is a good example of this pattern, and may be a good starting point for your own component.

The decisions and steps to create hooks and context providers are explored below.

#### 5.1 Hooks
Hooks are a great way to encapsulate state management and logic that is reusable across multiple components.
If your component provides context that should be accessible by child components (such as a toast component which provides a notification context), you should consider creating a [context provider](#context-providers).

_Note: hook creation is not yet supported by the generator, but this is planned functionality._

1. Determine whether your hook should be **global** (available to all components) or **local** (only available to a specific component). If your hook is global, you should create a new folder in `packages/react/ds-core/src/hooks` and follow the same steps as you would for creating a component. 
   1. If your hook is **local**, create a `<hookName>.ts` file inside the component's directory. **Example: [useDrawer](../../apps/react/demo/src/ui/Drawer/useDrawer.ts)**
      1. If your component has more than one hook, you may wish to move its hooks to `src/ui/<ComponentName>/hooks`. **Example: [useProviderState](../../apps/react/demo/src/ui/Showcase/common/Example/hooks/useProviderState.ts)**
      2. If your hook needs its own types, you may instead create a folder for the hook, and split it into `index.ts`, `types.ts`, and `<hookName>.ts` files. **Example: [useWindowFitment](../../packages/react/ds-core/src/ui/hooks/useWindowFitment)**
   2. If your hook is **global**, create a `hookName` folder inside your package's `src/ui/hooks` directory. Create separate `index.ts`, `types.ts`, and `<hookName>.ts` files. **Example: [useWindowFitment](../../packages/react/ds-core/src/ui/hooks/useWindowFitment)**
2. Write all of your state management within the hook. Remember to use `useMemo` to memoize values and `useCallback` to memoize functions. 
3. Return your hook's value as a memoized dictionary using [`useMemo`](https://react.dev/reference/react/useMemo).
4. Invoke the hook in your component file, and bind the returned values to the component's JSX.

### 5.2 Context providers
Context providers are a great way to provide state and logic to child components without requiring the child components to declare the context or pass props in.

_Note: context provider creation is not yet supported by the generator, but this is planned functionality._

1. Create a `types.ts` file inside the component directory. Create a `ContextOptions` type that describes the state that will be provided to context consumers. See [example](../../apps/react/demo/src/ui/Showcase/common/Example/types.ts).
2. Create a `Context.tsx` file inside the component directory. This file should create an empty context using `createContext`, and bind the context to the type from `types.ts`. See [example](../../apps/react/demo/src/ui/Showcase/common/Example/Context.tsx).
3. Use [custom hooks](#hooks) to encapsulate the context state. Create a `common/hooks/<hookName>.ts` file inside the component directory. This file should create a custom hook that uses `useContext` to access the context and return the context value. See [example](../../apps/react/demo/src/ui/Showcase/common/Example/hooks/useProviderState.ts).
4. Create a `Provider.tsx` file inside the component directory. This file should create a simple component that accepts the props of your custom hooks, invokes the custom hooks to get the current state, and wraps a child component with the current context. See [example](../../apps/react/demo/src/ui/Showcase/common/Example/Provider.tsx).
5. Create an `index.ts` file inside the component directory. This file serves as the publicly consumed API for the component. It should export the Provider component, but also export any subcomponents that consume the context within the index component scope. See [example](../../apps/react/demo/src/ui/Showcase/common/Example/index.ts).