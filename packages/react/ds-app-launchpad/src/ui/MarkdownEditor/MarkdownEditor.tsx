/* @canonical/generator-ds 0.9.0-experimental.4 */
import hljs from "highlight.js";
import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import "../GitDiffViewer/common/CodeDiffViewer/HighlighTheme.css";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
  ViewModeTabs,
  icons,
} from "./common/index.js";
import useEditor from "./hooks/useEditor.js";
import "./styles.css";
import type { EditMode, MarkdownEditorProps } from "./types.js";

const componentCssClassName = "ds markdown-editor";

/**
 * A dual-mode Markdown editor for writing and previewing Markdown content.
 */
const MarkdownEditor = (
  {
    id,
    className,
    style,
    defaultValue,
    placeholder,
    hideToolbar = false,
    hidePreview = false,
    editMode: controlledEditMode,
    onEditModeChange: controlledOnEditModeChange,
  }: MarkdownEditorProps,
  ref: React.Ref<HTMLTextAreaElement | null>,
): React.ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [internalEditMode, setInternalEditMode] = useState<EditMode>("write");
  const { toolbar } = useEditor(textareaRef);

  const editMode = useMemo(() => {
    return controlledEditMode ?? internalEditMode;
  }, [controlledEditMode, internalEditMode]);

  const handleEditModeChange = useCallback(
    (newEditMode: EditMode) => {
      if (controlledOnEditModeChange) {
        controlledOnEditModeChange(newEditMode);
      } else {
        setInternalEditMode(newEditMode);
      }
    },
    [controlledOnEditModeChange],
  );

  useImperativeHandle<HTMLTextAreaElement | null, HTMLTextAreaElement | null>(
    ref,
    () => textareaRef.current,
  );

  useEffect(() => {
    if (previewRef.current && editMode === "preview") {
      for (const codeBlock of Array.from(
        previewRef.current.querySelectorAll<HTMLElement>("pre code"),
      )) {
        hljs.highlightElement(codeBlock);
      }
    }
  }, [editMode]);

  return (
    <div
      id={id}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="top-bar">
        {!hidePreview && (
          <ViewModeTabs
            editMode={editMode}
            onEditModeChange={handleEditModeChange}
          />
        )}
        {!hideToolbar && (
          <Toolbar label="Markdown Editor">
            <ToolbarGroup label="Text Formatting">
              <ToolbarButton
                label={toolbar.title.label}
                onClick={toolbar.title.handler}
                shortcut={toolbar.title.shortcut}
              >
                {icons.ToolbarTitle}
              </ToolbarButton>
              <ToolbarButton
                label={toolbar.bold.label}
                onClick={toolbar.bold.handler}
                shortcut={toolbar.bold.shortcut}
              >
                {icons.ToolbarBold}
              </ToolbarButton>
              <ToolbarButton
                label={toolbar.italic.label}
                onClick={toolbar.italic.handler}
                shortcut={toolbar.italic.shortcut}
              >
                {icons.ToolbarItalic}
              </ToolbarButton>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup label="Tools">
              <ToolbarButton
                label={toolbar.quote.label}
                onClick={toolbar.quote.handler}
                shortcut={toolbar.quote.shortcut}
              >
                {icons.ToolbarQuote}
              </ToolbarButton>
              <ToolbarButton
                label={toolbar.code.label}
                onClick={toolbar.code.handler}
                shortcut={toolbar.code.shortcut}
              >
                {icons.ToolbarCode}
              </ToolbarButton>
              <ToolbarButton
                label={toolbar.link.label}
                onClick={toolbar.link.handler}
                shortcut={toolbar.link.shortcut}
              >
                {icons.ToolbarLink}
              </ToolbarButton>
              <ToolbarButton
                label={toolbar.uList.label}
                onClick={toolbar.uList.handler}
                shortcut={toolbar.uList.shortcut}
              >
                {icons.ToolbarUnorderedList}
              </ToolbarButton>
              <ToolbarButton
                label={toolbar.oList.label}
                onClick={toolbar.oList.handler}
                shortcut={toolbar.oList.shortcut}
              >
                {icons.ToolbarOrderedList}
              </ToolbarButton>
            </ToolbarGroup>
          </Toolbar>
        )}
      </div>

      <textarea
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="editor-content"
        ref={textareaRef}
        style={style}
        hidden={editMode !== "write"}
      />
      {editMode === "preview" && (
        <div className="editor-content" style={style} ref={previewRef}>
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            components={{
              h1: ({ children }) => <h3>{children}</h3>,
              h2: ({ children }) => <h3>{children}</h3>,
            }}
          >
            {textareaRef.current?.value || defaultValue || "No content"}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

const ForwardedMarkdownEditor = forwardRef(MarkdownEditor);

export default ForwardedMarkdownEditor;
