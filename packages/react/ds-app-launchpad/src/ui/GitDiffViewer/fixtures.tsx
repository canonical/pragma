import type { CodeDiffViewerAddComment } from "./common/index.js";
import { parseGitDiff } from "./utils/index.js";

export const diffExample =
  parseGitDiff(`diff --git a/src/components/FileTree/FileItem.module.scss b/src/components/FileTree/FileItem.module.scss
index e6e9670..a0c74ab 100644
--- a/src/components/FileTree/FileItem.module.scss
+++ b/src/components/FileTree/FileItem.module.scss
@@ -17,9 +17,13 @@
    background-color: transparent;
    z-index: -1;
}
-&:hover::before {
+&:hover::before,
+&.selected::before {
     background: url('data:image/svg+xml,<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12.7956 2 13.5587 2.31607 14.1213 2.87868C14.6839 3.44129 15 4.20435 15 5V10C15 10.6204 14.8076 11.2256 14.4495 11.7323C14.0913 12.2389 13.5849 12.622 13 12.829V16L8.5 13H4C3.20435 13 2.44129 12.6839 1.87868 12.1213C1.31607 11.5587 1 10.7956 1 10V5C1 4.20435 1.31607 3.44129 1.87868 2.87868C2.44129 2.31607 3.20435 2 4 2H12ZM12 3.5H4C3.62712 3.50002 3.26761 3.63892 2.99158 3.88962C2.71555 4.14032 2.5428 4.48484 2.507 4.856L2.5 5V10C2.50002 10.3729 2.63892 10.7324 2.88962 11.0084C3.14032 11.2844 3.48484 11.4572 3.856 11.493L4 11.5H8.954L11.5 13.196L11.501 11.768L12.501 11.415C13.049 11.221 13.436 10.725 13.493 10.146L13.5 10V5C13.5 4.62712 13.3611 4.26761 13.1104 3.99158C12.8597 3.71555 12.5152 3.5428 12.144 3.507L12 3.5ZM7.976 8.25V9.75H4.994V8.25H7.976ZM10.981 5.25V6.75H4.994V5.25H10.981Z" fill="currentColor"/></svg>');
}
+&.selected::before {
+    border-left: 2px solid var(--vf-color-accent);
+}
 
+.fileName {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

@@ -30,4 +34,8 @@
    display: flex;
    align-items: center;
    gap: 8px;
+   padding: 4px 8px;
+   border-radius: 4px;
+   background-color: var(--vf-color-background-secondary);
+   transition: background-color 0.2s ease;
}
`)[0];

export const deletedFileDiffExample =
  parseGitDiff(`diff --git a/.vscode/launch.json b/.vscode/launch.json
deleted file mode 100644
index e368c54..0000000
--- a/.vscode/launch.json
+++ /dev/null
@@ -1,11 +0,0 @@
-{
-    "version": "0.2.0",
-    "configurations": [
-        {
-            "command": "./node_modules/.bin/astro dev",
-            "name": "Development server",
-            "request": "launch",
-            "type": "node-terminal"
-        }
-    ]
-}`)[0];

export const addedFileDiffExample =
  parseGitDiff(`diff --git a/src/components/CodeDiff/CodeDiff.module.scss b/src/components/CodeDiff/CodeDiff.module.scss
new file mode 100644
index 0000000..76ec9a4
--- /dev/null
+++ b/src/components/CodeDiff/CodeDiff.module.scss
@@ -0,0 +1,5 @@
+.codeDiffContainer {
+    display: block;
+    flex: 1;
+    min-width: 0;
+}
diff --git a/src/components/CodeDiff/FileDiff.module.scss b/src/components/CodeDiff/FileDiff.module.scss
new file mode 100644
index 0000000..5f67fba
`)[0];

export const commentExample = (
  <div
    style={{
      backgroundColor: "#e0e0e0",
      color: "black",
      padding: "5px",
      margin: "10px 5px",
      border: "1px solid #ccc",
      borderRadius: "4px",
    }}
  >
    Test comment
  </div>
);

export const addCommentExample: CodeDiffViewerAddComment = ({
  lineNumber,
  onClose,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      margin: "10px 5px",
    }}
  >
    <textarea
      style={{
        resize: "vertical",
      }}
      // biome-ignore lint/a11y/noAutofocus: when the comment is opened, the textarea should be focused
      autoFocus
      placeholder={`Comment on line ${lineNumber}`}
      // on enter, save the comment
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onClose();
        }
      }}
    />
    <button onClick={onClose} type="button">
      Close
    </button>
  </div>
);
