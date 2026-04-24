/** Props returned by menubar container helpers */
export interface MenubarMenuPropsResult {
  role: "menubar" | "menu";
  "aria-label"?: string;
}

/** Props returned by menubar item helpers */
export interface MenubarItemPropsResult {
  role: "menuitem";
  "aria-haspopup"?: true;
  "aria-expanded"?: boolean;
  tabIndex: 0 | -1;
}

/** Props returned by menubar list item helper */
export interface MenubarListItemPropsResult {
  role: "none";
}

/** Props returned by tree container helpers */
export interface TreeMenuPropsResult {
  role: "tree" | "group";
  "aria-label"?: string;
}

/** Props returned by tree item helpers */
export interface TreeItemPropsResult {
  role: "treeitem";
  "aria-expanded"?: boolean;
  tabIndex: 0 | -1;
}

/** Props returned by tree list item helper */
export interface TreeListItemPropsResult {
  role: "none";
}

/** Props returned by navigation item helper */
export interface NavigationItemPropsResult {
  "aria-current"?: "page";
}

/** Props returned by disclosure toggle helper */
export interface DisclosureTogglePropsResult {
  "aria-expanded": boolean;
  "aria-controls": string;
}

/** Props returned by disclosure item helper */
export interface DisclosureItemPropsResult {
  "aria-current"?: "page";
}
