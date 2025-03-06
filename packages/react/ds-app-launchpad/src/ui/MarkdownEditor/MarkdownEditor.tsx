/* @canonical/generator-ds 0.9.0-experimental.4 */
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
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
  ViewModeTabs,
  type ViewModeTabsProps,
  icons,
} from "./common/index.js";
import type { EditMode, MarkdownEditorProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds markdown-editor";

/**
 * A dual-mode Markdown editor for writing and previewing Markdown content.
 */
const MarkdownEditor = (
  {
    id,
    className,
    style,
    textareaStyle,
    previewStyle,
    defaultValue,
    placeholder,
    hideToolbar = false,
    hidePreview = false,
    editMode: controlledEditMode,
    onEditModeChange: controlledOnEditModeChange,
    emptyInputKeyword = "No content",
    ...textareaProps
  }: MarkdownEditorProps,
  ref: React.Ref<HTMLTextAreaElement | null>,
): React.ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalEditMode, setInternalEditMode] = useState<EditMode>("write");
  const [shouldFocusTextarea, setShouldFocusTextarea] = useState(false);

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

  return (
    <div
      id={id}
      style={style}
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
                label={"toolbar.title.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarTitle}
              </ToolbarButton>
              <ToolbarButton
                label={"toolbar.bold.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarBold}
              </ToolbarButton>
              <ToolbarButton
                label={"toolbar.italic.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarItalic}
              </ToolbarButton>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup label="Tools">
              <ToolbarButton
                label={"toolbar.quote.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarQuote}
              </ToolbarButton>
              <ToolbarButton
                label={"toolbar.code.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarCode}
              </ToolbarButton>
              <ToolbarButton
                label={"toolbar.link.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarLink}
              </ToolbarButton>
              <ToolbarButton
                label={"toolbar.uList.label"}
                onClick={() => {}}
                shortcut={""}
              >
                {icons.ToolbarUnorderedList}
              </ToolbarButton>
              <ToolbarButton
                label={"toolbar.oList.label"}
                onClick={() => {}}
                shortcut={""}
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
        hidden={editMode !== "write"}
        style={textareaStyle}
        {...textareaProps}
      />
      {editMode === "preview" && (
        <div className="editor-content" style={previewStyle}>
          {textareaRef.current?.value || defaultValue || "No content"}
        </div>
      )}
    </div>
  );
};

const ForwardedMarkdownEditor = forwardRef(MarkdownEditor);

export default ForwardedMarkdownEditor;
