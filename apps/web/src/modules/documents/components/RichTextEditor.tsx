import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

const COMMANDS = [
  { command: 'bold', label: 'B' },
  { command: 'italic', label: 'I' },
  { command: 'underline', label: 'U' },
  { command: 'insertUnorderedList', label: 'List' },
  { command: 'formatBlock', label: 'Quote', value: 'blockquote' },
] as const;

export function RichTextEditor({
  initialValue,
  onChange,
  placeholder,
}: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = sanitizeEditorHtml(initialValue);
  }, [initialValue]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = sanitizeEditorHtml(editor.innerHTML);
    if (html !== editor.innerHTML) editor.innerHTML = html;
    onChangeRef.current(html === '<p><br></p>' ? '' : html);
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  }

  return (
    <div className="documents-rich-editor">
      <div className="documents-rich-editor__toolbar" aria-label="Formatting">
        {COMMANDS.map((item) => (
          <button
            key={`${item.command}-${item.label}`}
            type="button"
            onClick={() => runCommand(item.command, 'value' in item ? item.value : undefined)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="documents-rich-editor__input"
        contentEditable
        data-placeholder={placeholder}
        onInput={emitChange}
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
      />
    </div>
  );
}

function sanitizeEditorHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
