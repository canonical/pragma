/**
 * jsdom shims for MOUNTING React Flow (`@xyflow/react`) in unit tests:
 * jsdom 28 implements neither `ResizeObserver` (the flow observes its
 * wrapper and every node) nor `DOMMatrixReadOnly` (d3-zoom parses the
 * pane's transform through it). Render-to-string tests need none of this
 * — the shims are for `render()`ed trees, where effects run.
 *
 * Import for side effects from any test file that mounts the well. Kept
 * as a fixture module (not `vitest.setup.ts`): only the definitions
 * suites need it, and a global stub would silently mask a component that
 * suddenly requires observation elsewhere.
 */

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class DOMMatrixReadOnlyStub {
  readonly m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([^)]+)\)/)?.[1];
    this.m22 = scale === undefined ? 1 : Number(scale);
  }
}

if (typeof window !== "undefined") {
  window.ResizeObserver ??=
    ResizeObserverStub as unknown as typeof ResizeObserver;
  (globalThis as { DOMMatrixReadOnly?: unknown }).DOMMatrixReadOnly ??=
    DOMMatrixReadOnlyStub;
}
