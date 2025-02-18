import type { FileTreeData } from "../../types.js";

export type ContextOptions = {
  depth: number;
  path: string;

  addChildNode: (node: FileTreeData) => void;
  childNodes: FileTreeData[];
};

export type FileOptions = {
  nodeType: "file";
};

export type FolderOptions = {
  nodeType: "folder";
  defaultOpen?: boolean;
};

export type ProviderProps = {
  /* A unique identifier for the Folder */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  name: string;
} & (FileOptions | FolderOptions);
