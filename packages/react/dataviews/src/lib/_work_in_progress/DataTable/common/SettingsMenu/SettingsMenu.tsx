import type { DataViewsMessages } from "@canonical/dataviews-core";
import {
  ContextualMenu,
  Icon,
  type MenuEntry,
  type MenuItem,
} from "@canonical/react-ds-global";
import {
  memo,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { MessagesContext } from "../../../../common/index.js";
import { composeMessage } from "../../../../utils/index.js";
import { useMenuPhase } from "../hooks/index.js";
import type { ColumnChange, ColumnSetting } from "../types.js";
import { spellDestinationKey } from "../utils/index.js";
import { ItemLabel } from "./common/ItemLabel/index.js";
import LabelsContext from "./LabelsContext.js";
import type { SettingsMenuProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-table-settings-menu";

/**
 * The class of the design system's menu, which the button drawn before the
 * menu mounts wears too, beside this menu's own.
 */
const triggerCssClassName = "ds contextual-menu data-table-settings-menu";

/** The class the design system's menu takes beside its own. */
const menuClassName = "data-table-settings-menu";

/** The message naming each change to a column. */
const CHANGE_MESSAGES = {
  hide: "hideNamedColumn",
  show: "showNamedColumn",
  "move-left": "moveNamedColumnLeft",
  "move-right": "moveNamedColumnRight",
} as const satisfies Readonly<Record<ColumnChange, keyof DataViewsMessages>>;

/** The menu's items, what choosing each does and what each says, by key. */
type ListedItems = {
  readonly items: MenuEntry[];
  readonly actions: ReadonlyMap<string, () => void>;
  readonly labels: ReadonlyMap<string, ReactNode>;
};

/** What a closed menu lists: nothing, built once. */
const NO_ITEMS: ListedItems = {
  items: [],
  actions: new Map(),
  labels: new Map(),
};

/** What one change to one column is called, with the column's own heading. */
const describeChange = (
  setting: ColumnSetting,
  change: ColumnChange,
  messages: DataViewsMessages,
): ReactNode =>
  composeMessage((place) =>
    messages[CHANGE_MESSAGES[change]](place(setting.column.header)),
  );

/** What a column that cannot be hidden says in place of its toggle. */
const describeAlwaysShown = (
  setting: ColumnSetting,
  messages: DataViewsMessages,
): ReactNode =>
  composeMessage((place) =>
    messages.columnAlwaysShown(place(setting.column.header)),
  );

/** The changes a column is listed with, in the order they are listed. */
const listChanges = (setting: ColumnSetting): readonly ColumnChange[] => [
  setting.hidden ? "show" : "hide",
  "move-left",
  "move-right",
];

/** The menu's items, with what choosing and showing each one does, by its key. */
const listItems = (
  {
    settings,
    resettable,
    onChange,
    onReset,
  }: Pick<
    SettingsMenuProps,
    "settings" | "resettable" | "onChange" | "onReset"
  >,
  messages: DataViewsMessages,
): ListedItems => {
  const actions = new Map<string, () => void>([["reset", onReset]]);
  const labels = new Map<string, ReactNode>();
  /** An item rendered by the shared label, its content kept by key. */
  const buildItem = (
    key: string,
    content: ReactNode,
    disabled: boolean,
  ): MenuItem => {
    labels.set(key, content);
    return { key, disabled, displayItemsType: "custom", Component: ItemLabel };
  };
  const items: MenuEntry[] = settings.flatMap((setting): MenuEntry[] => {
    const { id, hideable } = setting.column;
    const entries = listChanges(setting).map((change) => {
      const key = spellDestinationKey(id, change);
      actions.set(key, () => {
        onChange(id, change);
      });
      // A column that cannot be hidden says so where its toggle would be,
      // and choosing it says so again, so a reader who cannot see a greyed
      // item still hears why.
      return hideable === false && change === "hide"
        ? buildItem(key, describeAlwaysShown(setting, messages), false)
        : buildItem(
            key,
            describeChange(setting, change, messages),
            !setting.offers[change],
          );
    });
    return [...entries, { type: "separator", key: `separator:${id}` }];
  });
  items.push(buildItem("reset", messages.resetTableSettings, !resettable));
  return { items, actions, labels };
};

/**
 * Almost all configurable aspects of the table are available through the
 * table settings menu. This menu provides a centralized interface accessed
 * through a settings wheel (gear) icon button in the table header for
 * column reordering, column pinning, column visibility, and resetting user
 * customizations.
 *
 * That is the design system's description of the block. What this
 * implementation covers: each column's visibility and its place, and the
 * reset; no pinning, and no keyboard shortcuts reference.
 *
 * Every declared column is listed in the arrangement's order, hidden ones
 * included, with a toggle named for it — Hide or Show — and Move left and
 * Move right, which step past the shown column beside it. A column declared
 * `hideable: false` says it is always shown in place of its toggle; the last
 * column shown cannot be hidden, and a hidden column does not move. Reset
 * table settings returns every column's width, place and visibility to the
 * arrangement beneath the viewer's own changes. Choosing an item closes the
 * menu and returns focus to its button; the table announces what changed.
 * The items are listed only while the menu is open. Every word is the
 * table's messages'.
 *
 * Before scripts take over it is a disclosure of real links, each to the
 * same query carrying the arrangement its change leaves, where the provider
 * has a location to lead to; without one it offers nothing. A reader on a
 * link as scripts take over keeps focus on the menu's button.
 *
 * @implements ds:apps.subcomponent.data_table-settings_menu
 */
function SettingsMenu(props: SettingsMenuProps): ReactElement | null {
  const {
    settings,
    resettable,
    hydrated,
    onChange,
    onReset,
    listDestinations,
  } = props;
  const messages = useContext(MessagesContext);
  const { phase, placeholder, menuRoot, openMenu, closeMenu } = useMenuPhase();
  const closed = phase === "closed";
  const { items, actions, labels } = useMemo(
    () =>
      closed
        ? NO_ITEMS
        : listItems({ settings, resettable, onChange, onReset }, messages),
    [closed, settings, resettable, onChange, onReset, messages],
  );
  const choose = useCallback(
    (item: MenuItem) => {
      // Every item the menu can choose is keyed here: separators and disabled
      // items are not chosen. The design system types an item's key as
      // optional; every item listed here has one.
      actions.get(String(item.key))?.();
    },
    [actions],
  );
  // The disclosure a server rendered, and whether it held focus as scripts
  // took over: the button replacing it takes that focus.
  const disclosure = useRef<HTMLDetailsElement>(null);
  const disclosureHadFocus = useRef(false);
  useLayoutEffect(() => {
    const opened = disclosure.current;
    if (!hydrated) {
      disclosureHadFocus.current =
        opened?.contains(opened.ownerDocument.activeElement) === true;
      return;
    }
    if (disclosureHadFocus.current) {
      disclosureHadFocus.current = false;
      placeholder.current?.focus();
    }
  }, [hydrated, placeholder]);
  const trigger = (
    <>
      <Icon icon="settings" />
      <span className="label">{messages.tableSettings}</span>
    </>
  );
  if (!hydrated) {
    const destinations = listDestinations();
    // No location: no link leads anywhere, so nothing is offered.
    if (destinations === null) {
      return null;
    }
    return (
      <details ref={disclosure} className={componentCssClassName}>
        <summary className="trigger">{trigger}</summary>
        <ul className="options">
          {settings.map((setting) => (
            <li key={setting.column.id}>
              {setting.column.hideable === false ? (
                <span>{describeAlwaysShown(setting, messages)}</span>
              ) : null}
              {listChanges(setting).map((change) => {
                const destination = destinations.changes.get(
                  spellDestinationKey(setting.column.id, change),
                );
                return destination === undefined ? null : (
                  <a key={change} href={destination}>
                    {describeChange(setting, change, messages)}
                  </a>
                );
              })}
            </li>
          ))}
          {resettable ? (
            <li>
              <a href={destinations.reset}>{messages.resetTableSettings}</a>
            </li>
          ) : null}
        </ul>
      </details>
    );
  }
  if (closed) {
    return (
      <div className={triggerCssClassName}>
        <button
          ref={placeholder}
          type="button"
          className="trigger"
          aria-haspopup="menu"
          aria-expanded={false}
          onClick={(event) => {
            openMenu(event.currentTarget);
          }}
        >
          {trigger}
        </button>
      </div>
    );
  }
  return (
    <LabelsContext value={labels}>
      <ContextualMenu
        ref={menuRoot}
        className={menuClassName}
        trigger={trigger}
        items={items}
        label={messages.tableSettings}
        open={phase === "open"}
        onOpenChange={closeMenu}
        onSelect={choose}
      />
    </LabelsContext>
  );
}

export default memo(SettingsMenu);
