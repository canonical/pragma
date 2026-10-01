# Preface

How this package's hydration tests are written. Read this before adding or changing a `*.hydration.tests.tsx` file.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- **A hydration test unmounts the root that `hydrateRoot` returns, uses fake timers, and asserts that no timer is left pending** (`vi.getTimerCount()` is 0 after the unmount). Otherwise a component's debounce timers fire after jsdom is torn down and fail an unrelated test. `Tooltip/withTooltip.hydration.tests.tsx` shows the pattern.
