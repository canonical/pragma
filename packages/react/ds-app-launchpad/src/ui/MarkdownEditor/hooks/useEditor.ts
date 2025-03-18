import { useCallback, useEffect } from "react";

type ToolbarAction = {
  shortcut: string | undefined;
  handler: () => void;
};

type EditorActions = {
  italic: ToolbarAction;
  bold: ToolbarAction;
  title: ToolbarAction;
  quote: ToolbarAction;
  code: ToolbarAction;
  uList: ToolbarAction;
  oList: ToolbarAction;
  link: ToolbarAction;
};

const useEditor = (
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
) => {
  const wrapText = useCallback(
    (character: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const isSelected = selectionStart !== selectionEnd;
      textarea.focus();

      if (isSelected) {
        const selectedText = textarea.value.slice(selectionStart, selectionEnd);
        const wrappedText = character + selectedText + character;
        document.execCommand("insertText", false, wrappedText);
        // Adjust selection to exclude the wrapping characters
        const newStart = selectionStart + character.length;
        const newEnd = selectionEnd + character.length;
        textarea.setSelectionRange(newStart, newEnd);
      } else {
        const insertText = character + character;
        document.execCommand("insertText", false, insertText);
        // Move cursor between the characters
        textarea.setSelectionRange(
          selectionStart + character.length,
          selectionStart + character.length,
        );
      }
    },
    [textareaRef],
  );

  const prefixLines = useCallback(
    (prefix: string | ((index: number) => string)) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const isSelected = selectionStart !== selectionEnd;

      const text = textarea.value;

      const lines = text.split("\n");
      const lineStartIndex =
        text.substring(0, selectionStart).split("\n").length - 1;
      const lineEndIndex = text.substring(0, selectionEnd).split("\n").length;

      // Extract selected lines and apply prefix
      const selectedLines = lines.slice(lineStartIndex, lineEndIndex);
      const wrappedLines = selectedLines.map((line, index) => {
        const prefixString =
          typeof prefix === "function" ? prefix(index) : prefix;
        return `${prefixString}${line}`;
      });

      // Calculate start and end positions of the selected lines
      let startPos = 0;
      for (let i = 0; i < lineStartIndex; i++) {
        startPos += lines[i].length + 1; // +1 for newline
      }
      let endPos = startPos;
      for (let i = lineStartIndex; i < lineEndIndex; i++) {
        endPos += lines[i].length + 1;
      }
      endPos -= 1;

      textarea.focus();
      textarea.setSelectionRange(startPos, endPos);
      document.execCommand("insertText", false, wrappedLines.join("\n"));

      if (isSelected) {
        const newEnd = startPos + wrappedLines.join("\n").length;
        textarea.setSelectionRange(startPos, newEnd);
      }
    },
    [textareaRef],
  );
  const handleItalic = useCallback(() => wrapText("*"), [wrapText]);

  const handleBold = useCallback(() => wrapText("**"), [wrapText]);

  const handleTitle = useCallback(() => prefixLines("### "), [prefixLines]);

  const handleQuote = useCallback(() => prefixLines("> "), [prefixLines]);

  const handleCode = useCallback(() => wrapText("`"), [wrapText]);

  const handleUList = useCallback(() => prefixLines("- "), [prefixLines]);

  const handleOList = useCallback(
    () => prefixLines((index) => `${index + 1}. `),
    [prefixLines],
  );

  const handleLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const isSelected = selectionStart !== selectionEnd;

    textarea.focus();
    const linkPlaceholder = "url";
    const placeholderLength = linkPlaceholder.length;
    if (isSelected) {
      const selectedText = textarea.value.slice(selectionStart, selectionEnd);
      const newText = `[${selectedText}](${linkPlaceholder})`;
      document.execCommand("insertText", false, newText);
      // Adjust selection to the URL part
      const newStart = selectionEnd + placeholderLength;
      const newEnd = newStart + placeholderLength;
      textarea.setSelectionRange(newStart, newEnd);
    } else {
      const insertText = "[](url)";
      const originalStart = selectionStart;
      document.execCommand("insertText", false, insertText);
      // Position cursor between the square brackets
      textarea.setSelectionRange(originalStart + 1, originalStart + 1);
    }
  }, [textareaRef]);

  const formatShortcut = (key: string, { isShift = false, isCtrl = false }) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctrlKey = isMac ? "⌘" : "^";
    const shiftKey = "⇧";
    return [isCtrl && ctrlKey, isShift && shiftKey, key.toUpperCase()]
      .filter(Boolean)
      .join(" ");
  };

  // To be called when a user types Enter in the textarea
  // Will insert the appropriate Markdown syntax for the next line
  // In case of lists, code block.
  const handleMarkdownSyntaxAutoComplete: (event: KeyboardEvent) => boolean =
    useCallback(
      (event) => {
        const textarea = textareaRef.current;
        if (!textarea) return false;

        if (event.key !== "Enter") return false;

        const { selectionStart, selectionEnd } = textarea;
        const hasSelection = selectionStart !== selectionEnd;
        if (hasSelection) return false;

        const textBeforeCursor = textarea.value.substring(0, selectionStart);
        const linesBeforeCursor = textBeforeCursor.split("\n");
        const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1];

        // list autocompletion
        const listRegex = /^(\s*)([-*]|\d+\.)\s/; // matches "- ", "* ", "1. "
        const listMatch = currentLine.match(listRegex);
        if (listMatch) {
          const leadingWhitespace = listMatch[1];
          const marker = listMatch[2];
          const restOfLine = currentLine.substring(listMatch[0].length).trim();

          // If the line is empty, exit list
          // and replace current line with empty line
          if (restOfLine.length === 0 || restOfLine === "[ ]") {
            const lineStart = selectionStart - currentLine.length;
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = selectionStart;
            document.execCommand("insertText", false, "\n");
            return true;
          }

          // Determine next marker based on type
          const isCheckbox = /^\[([ xX])\]/.test(restOfLine);
          const isOrdered = /\d/.test(marker);
          let nextMarker: string;
          if (isCheckbox) {
            nextMarker = `${leadingWhitespace}- [ ]`;
          } else {
            nextMarker = isOrdered
              ? `${Number.parseInt(marker) + 1}.`
              : `${marker}`;
          }
          const nextLine = `\n${leadingWhitespace}${nextMarker} `;
          document.execCommand("insertText", false, nextLine);
          return true;
        }

        // code block autocompletion
        const codeBlockRegex = /^(\s*)```/;
        const codeBlockMatch = currentLine.match(codeBlockRegex);
        if (codeBlockMatch) {
          const occurrences = (textBeforeCursor.match(/```/g) || []).length;
          if (occurrences % 2 === 1) {
            const newText = `${textBeforeCursor}\n\n\`\`\`${textarea.value.substring(
              selectionStart,
            )}`;
            textarea.value = newText;
            textarea.selectionStart = selectionStart + 1;
            textarea.selectionEnd = selectionStart + 1;
            return true;
          }
        }

        return false;
      },
      [textareaRef],
    );

  const handleShortcuts = useCallback(
    (event: KeyboardEvent) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCtrl = isMac ? event.metaKey : event.ctrlKey;
      const isShift = event.shiftKey;
      let shortcutHandled = false;
      // Ctrl + b
      if (isCtrl && event.key === "b") {
        handleBold();
        shortcutHandled = true;
      }

      // Ctrl + i
      if (isCtrl && event.key === "i") {
        handleItalic();
        shortcutHandled = true;
      }

      // Ctrl + k
      if (isCtrl && event.key === "k") {
        handleLink();
        shortcutHandled = true;
      }

      // Ctrl + .
      if (isCtrl && event.key === ".") {
        handleQuote();
        shortcutHandled = true;
      }

      // Ctrl + e
      if (isCtrl && event.key === "e") {
        handleCode();
        shortcutHandled = true;
      }

      // Ctrl + Shift + 7
      if (isCtrl && isShift && event.key === "7") {
        handleOList();
        shortcutHandled = true;
      }

      // Ctrl + Shift + 8
      if (isCtrl && isShift && event.key === "8") {
        handleUList();
        shortcutHandled = true;
      }

      if (!shortcutHandled) {
        shortcutHandled = handleMarkdownSyntaxAutoComplete(event);
      }

      if (shortcutHandled) {
        event.preventDefault();
      } else {
        event.stopPropagation();
      }
    },
    [
      textareaRef,
      handleBold,
      handleItalic,
      handleLink,
      handleQuote,
      handleCode,
      handleOList,
      handleUList,
      handleMarkdownSyntaxAutoComplete,
    ],
  );

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.addEventListener("keydown", handleShortcuts);
    return () => {
      if (!textareaRef.current) return;
      textareaRef.current.removeEventListener("keydown", handleShortcuts);
    };
  }, [textareaRef, handleShortcuts]);

  if (typeof window === "undefined") return {};

  return {
    toolbar: {
      italic: {
        shortcut: formatShortcut("i", { isCtrl: true }),
        handler: handleItalic,
      },
      bold: {
        shortcut: formatShortcut("b", { isCtrl: true }),
        handler: handleBold,
      },
      title: {
        shortcut: undefined,
        handler: handleTitle,
      },
      quote: {
        shortcut: formatShortcut(".", { isCtrl: true }),
        handler: handleQuote,
      },
      code: {
        shortcut: formatShortcut("e", { isCtrl: true }),
        handler: handleCode,
      },
      uList: {
        shortcut: formatShortcut("8", { isCtrl: true, isShift: true }),
        handler: handleUList,
      },

      oList: {
        shortcut: formatShortcut("7", { isCtrl: true, isShift: true }),
        handler: handleOList,
      },
      link: {
        shortcut: formatShortcut("k", { isCtrl: true }),
        handler: handleLink,
      },
    } satisfies EditorActions,
  };
};

export default useEditor;
