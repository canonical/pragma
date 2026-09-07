import type {
  ComponentType,
  FC,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import { useRef } from "react";
import SidePanel from "./SidePanel.js";
import type { SidePanelHandle, SidePanelProps } from "./types.js";

/**
 * What the panel shows: plain content, or a function receiving a `close` to
 * dismiss the panel — for content with its own exit routes, a form's
 * Cancel/Save buttons say.
 */
export type SidePanelChildren = ReactNode | ((close: () => void) => ReactNode);

/**
 * The one prop a trigger must accept. Written in method syntax on purpose:
 * TypeScript checks method parameters bivariantly, which lets a trigger with
 * a more specific event (`MouseEventHandler<HTMLButtonElement>`, say) satisfy
 * this — property syntax would demand the reverse and reject every real
 * trigger.
 */
export type WithSidePanelTriggerProps = {
  onClick?(event: MouseEvent): void;
};

/**
 * Pair a trigger with a SidePanel it toggles.
 *
 * The panel renders next to the trigger and is `position: fixed`, so where in
 * the tree they sit does not move it — but providers above that spot must
 * still cover the panel's content. The trigger's own `onClick` runs first;
 * the panel toggles regardless of what it does.
 *
 * The panel itself stays stateless from the HOC's point of view: the dialog's
 * native open state is the only one, and the toggle reads it. Escape and the
 * header's close button dismiss the panel on their own — the HOC has no state
 * to be told about.
 *
 * ```tsx
 * const AddMachine = withSidePanel(Button, (close) => (
 *   <>
 *     <SidePanel.Header>Add machine</SidePanel.Header>
 *     <SidePanel.Content>
 *       <MachineForm onCancel={close} onSubmit={(data) => { save(data); close(); }} />
 *     </SidePanel.Content>
 *   </>
 * ));
 *
 * <AddMachine importance="primary">Add machine</AddMachine>
 * ```
 *
 * @param Trigger The component that toggles the panel — anything that takes
 * an `onClick`.
 * @param panelChildren The panel's content, or a function receiving `close`.
 * @param panelProps Props for the panel itself — `aria-label` when there is
 * no header, `closeOnOutsideClick`, and so on. `ref` and `children` belong
 * to the HOC.
 */
const withSidePanel = <TProps extends WithSidePanelTriggerProps>(
  Trigger: ComponentType<TProps>,
  panelChildren: SidePanelChildren,
  panelProps: Omit<SidePanelProps, "ref" | "children"> = {},
): FC<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement => {
    const panelRef = useRef<SidePanelHandle>(null);

    // The dialog's native open state is the only one: read it, then flip it.
    const toggle = (): void => {
      const handle = panelRef.current;
      if (!handle) return;
      if (handle.element?.open) handle.close();
      else handle.open();
    };

    return (
      <>
        <Trigger
          {...props}
          onClick={(event) => {
            props.onClick?.(event);
            toggle();
          }}
        />
        <SidePanel ref={panelRef} {...panelProps}>
          {typeof panelChildren === "function"
            ? panelChildren(() => panelRef.current?.close())
            : panelChildren}
        </SidePanel>
      </>
    );
  };

  WrappedComponent.displayName = `withSidePanel(${
    Trigger.displayName || Trigger.name || "Component"
  })`;

  return WrappedComponent;
};

export default withSidePanel;
