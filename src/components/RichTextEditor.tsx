import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Superscript, Subscript,
  List, ListOrdered, FunctionSquare, ImagePlus, Loader2,
} from "lucide-react";
import { uploadQuizImage } from "@/lib/quiz-client";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Single-line mode for short answer fields */
  singleLine?: boolean;
  /** Disable editing */
  disabled?: boolean;
  /** Extra className on the outer wrapper */
  className?: string;
  /** Minimal toolbar (just B/I/U/fx) for answer fields */
  minimal?: boolean;
}

/* ─── Toolbar button config ─────────────────────────────────────────────────── */

interface ToolbarAction {
  icon: React.ElementType;
  command: string;
  arg?: string;
  title: string;
  /** Custom handler instead of execCommand */
  custom?: () => void;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Type here…",
  singleLine = false,
  disabled = false,
  className = "",
  minimal = false,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  /* ── Sync external value → editor (only when value changes externally) ─── */
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
    setIsEmpty(!value || value === "<br>" || value.replace(/<[^>]*>/g, "").trim() === "");
  }, [value]);

  /* ── Emit changes ─────────────────────────────────────────────────────── */
  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalUpdate.current = true;
    const html = el.innerHTML;
    const textOnly = el.textContent?.trim() ?? "";
    setIsEmpty(!textOnly && !html.includes("<img"));
    onChange(textOnly || html.includes("<img") ? html : "");
  }, [onChange]);

  /* ── Toolbar exec ─────────────────────────────────────────────────────── */
  const exec = useCallback((command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }, [emitChange]);

  /* ── Insert LaTeX placeholder ─────────────────────────────────────────── */
  const insertLatex = useCallback(() => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const selectedText = sel?.toString() ?? "";
    if (selectedText) {
      // Wrap selection in $ ... $
      document.execCommand("insertText", false, `$${selectedText}$`);
    } else {
      document.execCommand("insertText", false, "$  $");
      // Move cursor between the $ signs
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.setStart(range.startContainer, range.startOffset - 2);
        range.setEnd(range.startContainer, range.startOffset);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    emitChange();
  }, [emitChange]);

  /* ── Paste handler (images from clipboard) ────────────────────────────── */
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        setUploading(true);
        try {
          const url = await uploadQuizImage(file);
          editorRef.current?.focus();
          document.execCommand(
            "insertHTML",
            false,
            `<img src="${url}" alt="Pasted image" style="max-width:100%;max-height:300px;border-radius:8px;margin:4px 0;" />`
          );
          emitChange();
        } catch (err) {
          console.error("Image paste upload failed:", err);
        } finally {
          setUploading(false);
        }
        return;
      }
    }
    // If no image, let default paste happen (plain text is fine)
    // But strip external HTML formatting on paste to keep things clean
    // We'll allow it naturally since the user might paste formatted content
  }, [emitChange]);

  /* ── Keyboard shortcuts ───────────────────────────────────────────────── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (singleLine && e.key === "Enter") {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b": e.preventDefault(); exec("bold"); break;
        case "i": e.preventDefault(); exec("italic"); break;
        case "u": e.preventDefault(); exec("underline"); break;
      }
    }
  }, [exec, singleLine]);

  /* ── Toolbar config ───────────────────────────────────────────────────── */
  const fullActions: ToolbarAction[] = [
    { icon: Bold,        command: "bold",          title: "Bold (Ctrl+B)" },
    { icon: Italic,      command: "italic",        title: "Italic (Ctrl+I)" },
    { icon: Underline,   command: "underline",     title: "Underline (Ctrl+U)" },
    { icon: Superscript, command: "superscript",   title: "Superscript" },
    { icon: Subscript,   command: "subscript",     title: "Subscript" },
    { icon: List,        command: "insertUnorderedList", title: "Bullet List" },
    { icon: ListOrdered, command: "insertOrderedList",   title: "Numbered List" },
    { icon: FunctionSquare, command: "",            title: "Insert LaTeX ($…$)", custom: insertLatex },
  ];

  const minimalActions: ToolbarAction[] = [
    { icon: Bold,        command: "bold",          title: "Bold (Ctrl+B)" },
    { icon: Italic,      command: "italic",        title: "Italic (Ctrl+I)" },
    { icon: Underline,   command: "underline",     title: "Underline (Ctrl+U)" },
    { icon: Superscript, command: "superscript",   title: "Superscript" },
    { icon: Subscript,   command: "subscript",     title: "Subscript" },
    { icon: FunctionSquare, command: "",            title: "Insert LaTeX ($…$)", custom: insertLatex },
  ];

  const actions = minimal ? minimalActions : fullActions;

  /* ── Manual image insert (file picker) ────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadQuizImage(file);
      editorRef.current?.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${url}" alt="Uploaded image" style="max-width:100%;max-height:300px;border-radius:8px;margin:4px 0;" />`
      );
      emitChange();
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [emitChange]);

  return (
    <div className={`rich-text-editor rounded-lg border border-input bg-background overflow-hidden ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-input bg-muted/40 flex-wrap">
        {actions.map(({ icon: Icon, command, arg, title, custom }) => (
          <button
            key={title}
            type="button"
            title={title}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent editor blur
              if (custom) custom();
              else exec(command, arg);
            }}
            className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}

        {/* Separator */}
        {!minimal && <div className="w-px h-5 bg-border mx-1" />}

        {/* Image upload button */}
        {!minimal && (
          <>
            <button
              type="button"
              title="Insert image (or paste from clipboard)"
              onMouseDown={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </>
        )}

        {uploading && (
          <span className="text-[10px] font-medium text-muted-foreground ml-1">Uploading…</span>
        )}
      </div>

      {/* ── Editable area ── */}
      <div className="relative">
        {isEmpty && !disabled && (
          <div className="absolute inset-0 px-3 py-2 pointer-events-none text-muted-foreground/50 text-sm select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className={`
            rich-text-editable
            px-3 py-2 outline-none text-sm
            ${singleLine ? "min-h-[2.25rem] max-h-[4rem] overflow-y-auto" : "min-h-[5rem] max-h-[20rem] overflow-y-auto"}
            [&_b]:font-bold [&_strong]:font-bold
            [&_i]:italic [&_em]:italic
            [&_u]:underline
            [&_sup]:text-[0.7em] [&_sup]:align-super
            [&_sub]:text-[0.7em] [&_sub]:align-sub
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-1
            [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-1
            [&_li]:my-0.5
            [&_img]:inline-block [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1
          `}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
