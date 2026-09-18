const DEFAULT_ICON_ROOT = "/icons";

let iconRoot = DEFAULT_ICON_ROOT;

export const getIconRoot = (): string => iconRoot;

/** Configure the default asset root used by design-system icon components. */
export const setIconRoot = (rootPath: string): void => {
  iconRoot = rootPath;
};
