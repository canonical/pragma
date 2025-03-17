/* @canonical/generator-ds 0.9.0-experimental.4 */
import hljs from "highlight.js";
import type React from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  Toolbar,
  ViewModeTabs,
  type ViewModeTabsProps,
  icons,
} from "./common/index.js";
import "./styles.css";
import type { EditMode, MarkdownEditorProps } from "./types.js";
("react-markdown");

import "../GitDiffViewer/common/CodeDiffViewer/HighlighTheme.css";
import { useEditor } from "./hooks/index.js";
const componentCssClassName = "ds markdown-editor";
const componentCssWithBorderClassName = "bordered";
/**
 * A dual-mode Markdown editor for writing and previewing Markdown content.
 */
const MarkdownEditor = ({
  ref,
  id,
  className,
  style,
  textareaStyle,
  previewStyle,
  defaultValue,
  placeholder,
  hideToolbar = false,
  hidePreview = false,
  borderless = false,
  editMode: controlledEditMode,
  onEditModeChange: controlledOnEditModeChange,
  emptyInputMessage = "No content",
  toolbarBarLabelMessage = "Markdown Editor",
  ToolbarTextFormattingGroupLabelMessage = "Text Formatting",
  ToolbarToolsGroupLabelMessage = "Tools",
  ToolbarTitleButtonLabelMessage = "Title",
  ToolbarBoldButtonLabelMessage = "Bold",
  ToolbarItalicButtonLabelMessage = "Italic",
  ToolbarQuoteButtonLabelMessage = "Quote",
  ToolbarCodeButtonLabelMessage = "Code",
  ToolbarLinkButtonLabelMessage = "Link",
  ToolbarUnorderedListButtonLabelMessage = "Unordered List",
  ToolbarOrderedListButtonLabelMessage = "Ordered List",
  ...textareaProps
}: MarkdownEditorProps): React.ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [internalEditMode, setInternalEditMode] = useState<EditMode>("write");
  const [shouldFocusTextarea, setShouldFocusTextarea] = useState(false);
  const { toolbar } = useEditor(textareaRef);

  const editMode = useMemo(() => {
    return controlledEditMode ?? internalEditMode;
  }, [controlledEditMode, internalEditMode]);

  const handleEditModeChange: ViewModeTabsProps["onEditModeChange"] =
    useCallback(
      (newEditMode, eventType) => {
        if (controlledOnEditModeChange) {
          controlledOnEditModeChange(newEditMode);
        } else {
          setInternalEditMode(newEditMode);
        }
        // Set flag to focus textarea when switching to write mode after click
        if (eventType === "click" && newEditMode === "write") {
          setShouldFocusTextarea(true);
        }
      },
      [controlledOnEditModeChange],
    );

  useImperativeHandle<HTMLTextAreaElement | null, HTMLTextAreaElement | null>(
    ref,
    () => textareaRef.current,
  );

  // Focus textarea when edit mode changes to "write"
  useEffect(() => {
    if (editMode === "write" && shouldFocusTextarea) {
      // Use a small timeout to ensure DOM has updated
      const focusTimeout = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        setShouldFocusTextarea(false);
      }, 10);

      return () => clearTimeout(focusTimeout);
    }
  }, [editMode, shouldFocusTextarea]);

  useEffect(() => {
    if (previewRef.current && editMode === "preview") {
      for (const codeBlock of Array.from(
        previewRef.current.querySelectorAll<HTMLElement>("pre code"),
      )) {
        if (!codeBlock.dataset.highlighted) {
          hljs.highlightElement(codeBlock);
        }
      }
    }
  }, [editMode]);

  return (
    <div
      id={id}
      style={style}
      className={[
        componentCssClassName,
        className,
        !borderless && componentCssWithBorderClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="top-bar">
        {!hidePreview && (
          <ViewModeTabs
            editMode={editMode}
            onEditModeChange={handleEditModeChange}
          />
        )}
        {!hideToolbar && (
          <Toolbar label={toolbarBarLabelMessage}>
            <Toolbar.Group label={ToolbarTextFormattingGroupLabelMessage}>
              <Toolbar.Button
                label={ToolbarTitleButtonLabelMessage}
                onClick={toolbar.title.handler}
                shortcut={toolbar.title.shortcut}
              >
                {icons.ToolbarTitle}
              </Toolbar.Button>
              <Toolbar.Button
                label={ToolbarBoldButtonLabelMessage}
                onClick={toolbar.bold.handler}
                shortcut={toolbar.bold.shortcut}
              >
                {icons.ToolbarBold}
              </Toolbar.Button>
              <Toolbar.Button
                label={ToolbarItalicButtonLabelMessage}
                onClick={toolbar.italic.handler}
                shortcut={toolbar.italic.shortcut}
              >
                {icons.ToolbarItalic}
              </Toolbar.Button>
            </Toolbar.Group>
            <Toolbar.Separator />
            <Toolbar.Group label={ToolbarToolsGroupLabelMessage}>
              <Toolbar.Button
                label={ToolbarQuoteButtonLabelMessage}
                onClick={toolbar.quote.handler}
                shortcut={toolbar.quote.shortcut}
              >
                {icons.ToolbarQuote}
              </Toolbar.Button>
              <Toolbar.Button
                label={ToolbarCodeButtonLabelMessage}
                onClick={toolbar.code.handler}
                shortcut={toolbar.code.shortcut}
              >
                {icons.ToolbarCode}
              </Toolbar.Button>
              <Toolbar.Button
                label={ToolbarLinkButtonLabelMessage}
                onClick={toolbar.link.handler}
                shortcut={toolbar.link.shortcut}
              >
                {icons.ToolbarLink}
              </Toolbar.Button>
              <Toolbar.Button
                label={ToolbarUnorderedListButtonLabelMessage}
                onClick={toolbar.uList.handler}
                shortcut={toolbar.uList.shortcut}
              >
                {icons.ToolbarUnorderedList}
              </Toolbar.Button>
              <Toolbar.Button
                label={ToolbarOrderedListButtonLabelMessage}
                onClick={toolbar.oList.handler}
                shortcut={toolbar.oList.shortcut}
              >
                {icons.ToolbarOrderedList}
              </Toolbar.Button>
            </Toolbar.Group>
          </Toolbar>
        )}
      </div>

      <textarea
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="editor-content"
        ref={textareaRef}
        hidden={editMode !== "write"}
        style={textareaStyle}
        {...textareaProps}
      />
      {editMode === "preview" && (
        <div className="editor-content" style={previewStyle} ref={previewRef}>
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h3>{children}</h3>,
              h2: ({ children }) => <h3>{children}</h3>,
            }}
          >
            {textareaRef.current?.value || defaultValue || emptyInputMessage}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
