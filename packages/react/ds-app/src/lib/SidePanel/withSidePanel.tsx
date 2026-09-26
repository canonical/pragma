import type { ComponentType, ReactElement } from "react";
import { useRef } from "react";
import type {
  SidePanelHandle,
  WithSidePanelRender,
  WithSidePanelTriggerProps,
} from "./types.js";

/**
 * Wraps a trigger with a panel it toggles. Click the trigger → the panel
 * opens; click it again → the panel closes.
 *
 * **The wrapped component must accept `onClick`** and forward it to the
 * clickable element at its root — the HOC composes its toggle handler onto
 * the trigger itself, with no wrapper element in between. An `onClick` the
 * consumer passes keeps working: it runs first, then the panel toggles.
 *
 * The second argument is a function: the HOC calls it with a props object
 * carrying `close` and `ref`, and it returns a complete `<SidePanel>`
 * element — sections, props and all:
 *
 * ```tsx
 * const ToggleButton = withSidePanel(
 *   Button,
 *   ({ ref }) => (
 *     <SidePanel ref={ref}>
 *       <SidePanel.Header>Filters</SidePanel.Header>
 *       <SidePanel.Content>…</SidePanel.Content>
 *     </SidePanel>
 *   ),
 * );
 * <ToggleButton>Filters</ToggleButton>;
 * ```
 *
 * Everything `SidePanel` accepts lives on the element the function returns —
 * `aria-label`, `onClose`, `className` — so the
 * consumer sees the real panel, not an options bag. **One duty comes with
 * that freedom: the factory must attach the `ref` it receives to the
 * `<SidePanel>`** (`<SidePanel ref={ref}>`). The trigger toggles the panel
 * through that ref — and `SidePanel` requires its `ref`, so a factory that
 * forgets it fails to compile.
 *
 * **How it closes:** the trigger toggles it; the header's X button and
 * Escape dismiss it too — the HOC has no state to be told about, the
 * dialog's native open state is the only one. A footer button can close it
 * as well — wire one to the `close` the function receives:
 *
 * ```tsx
 * const machinePanel: WithSidePanelRender = ({ close, ref }) => (
 *   <SidePanel ref={ref}>
 *     <SidePanel.Header>Add machine</SidePanel.Header>
 *     <SidePanel.Footer>
 *       <Button onClick={close}>Cancel</Button>
 *     </SidePanel.Footer>
 *   </SidePanel>
 * );
 *
 * const AddMachine = withSidePanel(Button, machinePanel);
 * ```
 *
 * `withSidePanel` is meant for static content and belongs at module scope,
 * called once. The function it is handed is invoked on every render of the
 * trigger, but at module scope it can only see module-level values, so what
 * it returns is the same on every render. If the panel must show data from
 * the parent — for example a different machine depending on which is
 * selected — don't call this HOC inside the component; compose `SidePanel`
 * directly and drive it through its `ref`.
 *
 * A pure composition wrapper: it renders the wrapped component and the panel
 * as siblings, so it carries no root element of its own. The panel is
 * `position: fixed`, so where in the tree they sit does not move it — but
 * providers above that spot must still cover the panel's content.
 *
 * `import { withSidePanel } from "@canonical/react-ds-app";`
 *
 * @param Trigger The component that toggles the panel (e.g. `Button`). It must accept `onClick` and forward it to its root element; clicking it toggles the panel.
 * @param panel A {@link WithSidePanelRender} function: it receives `{ close, ref }`, must attach `ref` to the `<SidePanel>` it returns, and the trigger toggles it.
 */
const withSidePanel = <TProps extends WithSidePanelTriggerProps>(
  Trigger: ComponentType<TProps>,
  panel: WithSidePanelRender,
): ComponentType<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement => {
    const panelRef = useRef<SidePanelHandle>(null);

    // The contract: the HOC hands the factory its own ref, and the factory
    // sets it on the `<SidePanel>` it returns. `SidePanel` requires its
    // `ref`, so a factory that forgets `ref={ref}` fails to compile.
    const panelElement = panel({
      close: () => panelRef.current?.close(),
      ref: panelRef,
    });

    return (
      <>
        <Trigger
          {...props}
          onClick={(event) => {
            // The consumer's handler runs first, then the panel toggles; a
            // preventDefault or stopPropagation there does not gate the toggle.
            props.onClick?.(event);
            panelRef.current?.toggle();
          }}
        />
        {panelElement}
      </>
    );
  };

  // Set the displayName for easier debugging
  WrappedComponent.displayName = `withSidePanel(${
    Trigger.displayName || Trigger.name || "AnonymousComponent"
  })`;

  return WrappedComponent;
};

export default withSidePanel;
