import { useCallback, useEffect } from "react";

type ToolbarAction = {
  label: string;
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

  return {
    toolbar: {
      italic: {
        label: "Italic",
        shortcut: formatShortcut("i", { isCtrl: true }),
        handler: handleItalic,
      },
      bold: {
        label: "Bold",
        shortcut: formatShortcut("b", { isCtrl: true }),
        handler: handleBold,
      },
      title: {
        shortcut: undefined,
        label: "Title",
        handler: handleTitle,
      },
      quote: {
        label: "Quote",
        shortcut: formatShortcut(".", { isCtrl: true }),
        handler: handleQuote,
      },
      code: {
        label: "Code",
        shortcut: formatShortcut("e", { isCtrl: true }),
        handler: handleCode,
      },
      uList: {
        label: "Unordered List",
        shortcut: formatShortcut("8", { isCtrl: true, isShift: true }),
        handler: handleUList,
      },

      oList: {
        label: "Ordered List",
        shortcut: formatShortcut("7", { isCtrl: true, isShift: true }),
        handler: handleOList,
      },
      link: {
        label: "Link",
        shortcut: formatShortcut("k", { isCtrl: true }),
        handler: handleLink,
      },
    } satisfies EditorActions,
  };
};

export default useEditor;
