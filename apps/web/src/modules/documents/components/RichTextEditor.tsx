import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Italic, Underline, List, Quote, Code } from 'lucide-react';

const COMMANDS = [
  { command: 'bold', label: 'Bold', icon: Bold },
  { command: 'italic', label: 'Italic', icon: Italic },
  { command: 'underline', label: 'Underline', icon: Underline },
  { command: 'insertUnorderedList', label: 'Bulleted list', icon: List },
  { command: 'formatBlock', label: 'Quote', icon: Quote, value: 'blockquote' },
  { command: 'formatBlock', label: 'Code block', icon: Code, value: 'pre' },
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
    // Runs once on mount only (the parent remounts via `key={draft.id}` on page switch).
    // Re-running this on every `initialValue` change would fight the user's own typing:
    // onChange feeds edits back into `initialValue`, and resetting innerHTML on each
    // keystroke collapses the caret to the start of the editor.
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = sanitizeEditorHtml(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = sanitizeEditorHtml(editor.innerHTML);
    if (html !== editor.innerHTML) {
      editor.innerHTML = html;
      // Sanitization rewrote the DOM, so the caret was dropped — put it back at the end
      // rather than leaving it collapsed at position 0.
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    onChangeRef.current(html === '<p><br></p>' ? '' : html);
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === ' ') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const node = selection.focusNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const offset = selection.focusOffset;
          const beforeCaret = text.slice(0, offset);

          if (beforeCaret === '#') {
            e.preventDefault();
            document.execCommand('formatBlock', false, 'h1');
            node.textContent = text.slice(offset);
            emitChange();
            return;
          }
          if (beforeCaret === '##') {
            e.preventDefault();
            document.execCommand('formatBlock', false, 'h2');
            node.textContent = text.slice(offset);
            emitChange();
            return;
          }
          if (beforeCaret === '###') {
            e.preventDefault();
            document.execCommand('formatBlock', false, 'h3');
            node.textContent = text.slice(offset);
            emitChange();
            return;
          }
          if (beforeCaret === '>') {
            e.preventDefault();
            document.execCommand('formatBlock', false, 'blockquote');
            node.textContent = text.slice(offset);
            emitChange();
            return;
          }
          if (beforeCaret === '```') {
            e.preventDefault();
            document.execCommand('formatBlock', false, 'pre');
            node.textContent = text.slice(offset);
            emitChange();
            return;
          }
          if (beforeCaret === '-') {
            e.preventDefault();
            document.execCommand('insertUnorderedList', false);
            node.textContent = text.slice(offset);
            emitChange();
            return;
          }
        }
      }
    }
  }

  function handleInput() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const node = selection.focusNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const patterns = [
          { regex: /\*\*([^*]+)\*\*/, tag: 'strong' },
          { regex: /__([^_]+)__/, tag: 'strong' },
          { regex: /\*([^*]+)\*/, tag: 'em' },
          { regex: /_([^_]+)_/, tag: 'em' },
          { regex: /`([^`]+)`/, tag: 'code' },
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern.regex);
          if (match && match.index !== undefined) {
            const matchedText = match[0];
            const innerText = match[1];
            const matchIndex = match.index;

            const beforeText = text.slice(0, matchIndex);
            const afterText = text.slice(matchIndex + matchedText.length);

            const parent = node.parentNode;
            if (parent) {
              const beforeNode = document.createTextNode(beforeText);
              const formattedElement = document.createElement(pattern.tag);
              formattedElement.textContent = innerText;
              const afterNode = document.createTextNode(afterText || '\u200B');

              parent.insertBefore(beforeNode, node);
              parent.insertBefore(formattedElement, node);
              parent.insertBefore(afterNode, node);
              parent.removeChild(node);

              const newRange = document.createRange();
              newRange.setStart(afterNode, afterText ? 0 : 1);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              break;
            }
          }
        }
      }
    }
    emitChange();
  }

  return (
    <div className="documents-rich-editor">
      <div className="documents-rich-editor__toolbar" aria-label="Formatting">
        {COMMANDS.map((item) => (
          <button
            key={`${item.command}-${item.label}`}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={() => runCommand(item.command, 'value' in item ? item.value : undefined)}
          >
            <item.icon size={15} />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="documents-rich-editor__input"
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
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
