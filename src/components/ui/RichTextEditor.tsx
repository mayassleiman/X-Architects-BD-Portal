import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface RichTextEditorRef {
  insertText: (text: string) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ value, onChange, placeholder, className }, ref) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (contentRef.current) {
        contentRef.current.focus();
        document.execCommand('insertText', false, text);
        onChange(contentRef.current.innerHTML);
      }
    }
  }));

  // Sync value to contentEditable
  useEffect(() => {
    if (contentRef.current && value !== contentRef.current.innerHTML) {
      // Only update if the editor is NOT focused, to avoid cursor jumping while typing.
      // This allows external updates (like inserting variables via buttons) to work,
      // because clicking a button takes focus away from the editor.
      if (document.activeElement !== contentRef.current) {
        contentRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    // Prevent losing focus or restore it
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
      onChange(contentRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Check for image files in clipboard
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              execCommand('insertImage', event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const ToolbarButton = ({ icon: Icon, command, arg, title }: { icon: any, command: string, arg?: string, title: string }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from editor
      onClick={() => execCommand(command, arg)}
      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className={cn("flex flex-col border border-[var(--border)] rounded overflow-hidden bg-[var(--bg-tertiary)]", className)}>
      <div className="flex items-center gap-1 p-2 border-b border-[var(--border)] bg-[var(--card-bg)] flex-wrap">
        <ToolbarButton icon={Bold} command="bold" title="Bold" />
        <ToolbarButton icon={Italic} command="italic" title="Italic" />
        <ToolbarButton icon={Underline} command="underline" title="Underline" />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
        <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt("Enter image URL:");
            if (url) execCommand("insertImage", url);
          }}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          title="Insert Image URL"
        >
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt("Enter link URL:");
            if (url) execCommand("createLink", url);
          }}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          title="Insert Link"
        >
          <LinkIcon size={16} />
        </button>
      </div>
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 p-4 outline-none overflow-y-auto min-h-[200px] text-sm font-sans text-[var(--text-primary)]"
        placeholder={placeholder}
        style={{ whiteSpace: 'pre-wrap' }} // Preserve whitespace
      />
    </div>
  );
});
RichTextEditor.displayName = 'RichTextEditor';
