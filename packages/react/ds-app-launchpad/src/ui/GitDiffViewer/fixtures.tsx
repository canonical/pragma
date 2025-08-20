import type { CodeDiffViewerAddComment } from "./common/index.js";
import { parseGitDiff } from "./utils/index.js";

export const diffExample =
  parseGitDiff(`diff --git a/src/components/FileTree/test.ts b/src/components/FileTree/test.ts
index e6e9670..a0c74ab 100644
--- a/src/components/FileTree/test.ts
--- b/src/components/FileTree/test.ts
@@ -17,9 +17,13 @@
    /**
     * Batch request for public profiles
     */
    publicProfiles: defineAction({
        input: z.object({
            usernames: z.array(z.string()).max(100)
        }),
        handler: async (input, ctx) => {
            const profiles: Record<string, Person> = {};
            for (const username of input.usernames) {
                profiles[username] = await fetchProfile(username);
            }
            return profiles;
        }
    }),
 }`)[0];

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

export const commentExample = {
  6: (
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
  ),
};

export const addCommentExample: CodeDiffViewerAddComment = ({
  hunkLineNumber,
  diffLineNumber,
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
      placeholder={`Comment on line ${hunkLineNumber} (diff line ${diffLineNumber})`}
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
