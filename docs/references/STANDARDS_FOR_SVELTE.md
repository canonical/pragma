# Svelte Standards Reference

This document outlines the standards and conventions for developing Svelte components within the Canonical Design System. It aims to ensure consistency, maintainability, readability, and reusability across all Svelte packages.

## Introduction

Our Svelte components and development practices are guided by the following core principles:

* **Simplicity:** Strive for clear, understandable code, APIs, and component structures. Reduce complexity where possible.
* **Performance:** Optimize components for speed and efficiency in both development and production.
* **SSR Compatibility:** Ensure components can be rendered on the server side without issues.
* **Accessibility:** Aim for [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) compliance by default.
* **Modernity:** Embrace forward-looking technologies and best practices in the Svelte ecosystem.

## Component Logic (`svelte/component`)

### Component purity (`svelte/component/purity`)
All components must be decoupled from framework-specific logic and SvelteKit dependencies.

> ✅ **Do**
>
> + Pass data via props instead of importing from SvelteKit modules.
>   ```svelte
>   <script>
>     let { pageTitle } = $props();
>   </script>
>
>   <h1>{pageTitle}</h1>
>   ```
>
> ❌ **Don't**
>
> + Import from SvelteKit modules like `$app/stores`, `$app/navigation`, or `$app/environment`.
>   ```svelte
>   <script>
>     import { page } from '$app/stores';
>   </script>
>
>   <h1>{$page.data.title}</h1>
>   ```

### Describe effects (`svelte/component/effect-descriptions`)
Every `$effect` rune must have a descriptive comment explaining its intent.

> ✅ **Do**
>
> + Place a comment directly above the `$effect` explaining what it does and why.
>   ```javascript
>   // Sync the document title with the current page heading for accessibility
>   $effect(() => {
>     document.title = `${pageTitle} | Canonical`;
>   });
>   ```
>
> ❌ **Don't**
>
> + Use `$effect` without a comment.
>   ```javascript
>   $effect(() => {
>     document.title = `${pageTitle} | Canonical`;
>   });
>   ```

### Elements reference naming (`svelte/component/reference-naming`)
Differentiate between reactive and non-reactive element references in their naming.

> ✅ **Do**
>
> + Name reactive references (e.g., via `bind:this`) with the `Ref` suffix.
> + Name non-reactive references (e.g., via `querySelector`) with the `Element` suffix.
>   ```svelte
>   <script>
>     let containerRef = $state();
>     
>     $effect(() => {
>       const headerElement = containerRef?.querySelector('h1');
>     });
>   </script>
>
>   <div bind:this={containerRef}>
>     <h1>Title</h1>
>   </div>
>   ```
>
> ❌ **Don't**
>
> + Use generic or ambiguous names for element references.
>   ```svelte
>   <script>
>     let container = $state();
>     
>     $effect(() => {
>       const header = container.querySelector('h1');
>     });
>   </script>
>
>   <div bind:this={container}>
>     <h1>Title</h1>
>   </div>
>   ```

### use… functions (`svelte/component/use-functions`)
Reserve the `use…` prefix for functions encapsulating reusable, reactive, lifecycle-bound logic.

> ✅ **Do**
>
> + Call `use…` functions exclusively at the top-level scope of the `<script>` block.
>   ```svelte
>   <script>
>     const stopwatch = useStopwatch();
>   </script>
>
>   <button onclick={() => stopwatch.start()}>Start</button>
>   ```
> + Use standard functions (not `use..` functions) for utilities.
>   ```javascript
>   const formatted = formatDate(new Date());
>   ```
>
> ❌ **Don't**
>
> + Call `use…` functions inside event handlers or nested scopes.
>   ```svelte
>   <script>
>     function handleClick() {
>       const stopwatch = useStopwatch();
>       stopwatch.start();
>     }
>   </script>
>
>   <button onclick={handleClick}>Start</button>
>   ```

## Progressive Enhancement (`svelte/progressive-enhancement`)

### Prefer no JS approach (`svelte/progressive-enhancement/no-js`)
Ensure core functionality remains usable without client-side JavaScript.

> ✅ **Do**
>
> + Use native web APIs, HTML, and CSS for disclosure and interaction.
>   ```svelte
>   <!-- Uses native <details> and <summary> for disclosure -->
>   <details>
>     <summary>Click to show more</summary>
>     <p>This content is accessible without any JavaScript.</p>
>   </details>
>   ```
>
> ❌ **Don't**
>
> + Require JavaScript for basic UI toggles or navigation.
>   ```svelte
>   <script>
>     let isOpen = $state(false);
>   </script>
>
>   <!-- Requires JS for basic toggle functionality -->
>   <button onclick={() => isOpen = !isOpen}>
>     Toggle content
>   </button>
>   {#if isOpen}
>     <p>Visible only with JS.</p>
>   {/if}
>   ```

### Mount-gated progressive enhancement (`svelte/progressive-enhancement/mount-gating`)
Gate JS-enhanced behavior behind mount state to avoid pre-hydration assumptions.

> ✅ **Do**
>
> + Use a `useIsMounted()` helper to conditionally apply JS-only attributes.
>   ```svelte
>   <script>
>     import { useIsMounted } from './hooks.svelte.js';
>     const isMounted = useIsMounted();
>     let isOpen = $state(false);
>   </script>
>
>   <!-- Only apply ARIA attributes once JS is ready to handle them -->
>   <button
>     type="button"
>     aria-expanded={isMounted.value ? isOpen : undefined}
>     onclick={() => isOpen = !isOpen}
>   >
>     Menu
>   </button>
>   ```
> + Use [`@media (scripting: enabled)`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/scripting) to hide JS-only affordances for the first paint if necessary.
>
> ❌ **Don't**
>
> + Apply ARIA states or roles that imply behavior unavailable before hydration.
>   ```svelte
>   <script>
>     let isOpen = $state(false);
>   </script>
>
>   <!-- ARIA state implies behavior that won't work before hydration -->
>   <button
>     type="button"
>     aria-expanded={isOpen}
>     onclick={() => isOpen = !isOpen}
>   >
>     Menu
>   </button>
>   ```

## Composition (`svelte/composition`)

### Expose subcomponents (`svelte/composition/subcomponents`)
Lift iteration logic and complex UI structures to the consumer by exposing subcomponents.

> ✅ **Do**
>
> + Expose constituent parts as subcomponents to give consumers control over HTML.
>   ```svelte
>   <OptionsPanel>
>     <form action="?/updateProfile" method="POST">
>       <OptionsPanel.Group title="Profile">
>         {#each groups[0].options as option}
>           <OptionsPanel.Option
>             name="profile-field"
>             value={option.value}
>             aria-label={option.label}
>           >
>             {option.label}
>           </OptionsPanel.Option>
>         {/each}
>       </OptionsPanel.Group>
>       <OptionsPanel.SubmitButton>Save</OptionsPanel.SubmitButton>
>     </form>
>   </OptionsPanel>
>   ```
>
> ❌ **Don't**
>
> + Hide complex UI structures or iteration logic behind simple configuration props.
>   ```svelte
>   <OptionsPanel {groups} submitLabel="Save" />
>   ```

### Snippets for positioning, subcomponents for encapsulation (`svelte/composition/snippets-vs-subcomponents`)
Use snippets to control content placement and subcomponents to encapsulate logic and styles.

> ✅ **Do**
>
> + Pass primary content via the default `children` snippet.
> + Use named snippets for multiple, distinct areas.
>   ```svelte
>   <Card>
>     {#snippet header()}
>       <h3>Title</h3>
>     {/snippet}
>     
>     <p>Main content using children snippet.</p>
>   </Card>
>   ```
> + Use subcomponents to encapsulate specific behaviors and styles.
>
> ❌ **Don't**
>
> + Pass complex content or UI structures via props instead of snippets.
>   ```svelte
>   <Card 
>     header="Title" 
>     body="Main content" 
>   />
>   ```

### Passing attributes back to snippets (`svelte/composition/snippet-attributes`)
Pass descriptively named props objects back to snippets to allow consumers to wire up elements.

> ✅ **Do**
>
> + Provide a `triggerProps` (or similarly named) object for spreading onto target elements.
>   ```svelte
>   {@render trigger({ 
>     popovertarget: popoverId,
>     "aria-describedby": helpId 
>   })}
>
>   <MyComponent>
>     {#snippet trigger(triggerProps)}
>        <button {...triggerProps}>
>          Open Popover
>        </button>
>     {/snippet}
>   </MyComponent>
>   ```
>
> ❌ **Don't**
>
> + Render snippets without providing necessary attributes, forcing consumers to manually wire up internal IDs.
>   ```svelte
>   {@render trigger()}
>
>   <MyComponent>
>     {#snippet trigger()}
>        <button popovertarget="hardcoded-id">
>          Open Popover
>        </button>
>     {/snippet}
>   </MyComponent>
>   ```

### Svelte attachments naming (`svelte/composition/attachment-naming`)
Use specific, intent-based names for functions designed for the `{@attach …}` directive.

> ✅ **Do**
>
> + Use verbs or nouns that describe the attachment's behavior (e.g., `tooltip`, `observeHover`).
>   ```svelte
>   <button {@attach tooltip("Save changes")}>
>     Save
>   </button>
>   ```
>
> ❌ **Don't**
>
> + Use vague or generic names like `handler` or `myAttachment`.
>   ```svelte
>   <button {@attach handleHover(someData)}>
>     Save
>   </button>
>   ```

### Passing state across reactivity boundaries (`svelte/composition/reactivity-boundaries`)
Prefer getters when passing state across reactivity boundaries to maintain tracking.

> ✅ **Do**
>
> + Use property getters when working with objects (e.g., in `setContext`).
>   ```typescript
>   let greeting = $state("Hello");
>
>   setContext('my-context', {
>     get greeting() {
>       return greeting;
>     }
>   });
>   ```
> + Use getter functions (prefixed with `get…`) when passing state to functions like `use…` hooks.
>   ```typescript
>   // useStorage.ts
>   export function useStorage(getGreeting: () => string) {
>     $effect(() => {
>       localStorage.setItem('greeting', getGreeting());
>     });
>   }
>
>   // MyComponent.svelte
>   useStorage(() => greeting);
>   ```
>
> ❌ **Don't**
>
> + Pass raw reactive values directly to objects or functions where tracking might be lost.
>   ```typescript
>   // Object property - reactivity lost on reassignment
>   setContext('my-context', { greeting });
>
>   // Function argument - value is not reactive inside $effect
>   useStorage(greeting);
>   ```

### Stable IDs via $props.id() fallback (`svelte/composition/stable-ids`)
Ensure internal element relationships use stable IDs by falling back to `$props.id()`.

> ✅ **Do**
>
> + Resolve a stable ID by combining an optional `id` prop with a fallback.
>   ```typescript
>   const { id: idProp, ...rest } = $props();
>   const fallbackId = $props.id();
>   const id = $derived(idProp || fallbackId);
>   ```
>
> ❌ **Don't**
>
> + Fail to provide a fallback ID, breaking accessibility and internal wiring when the `id` prop is omitted.
>   ```typescript
>   // No fallback if id is not provided
>   const { id, ...rest } = $props();
>   ```
