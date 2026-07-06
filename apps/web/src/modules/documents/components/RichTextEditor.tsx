import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block', 'link'],
  ['clean'],
];

// Uncontrolled by design: `initialValue` seeds the editor once on mount and
// further edits are reported via onChange — syncing a controlled value back
// into Quill on every keystroke fights its own internal selection/undo
// state. Callers that need to swap documents should remount via a `key`
// prop (see DocumentEditor.tsx's `key={draft.id}`).
export function RichTextEditor({ initialValue, onChange, placeholder }: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    // Guards against React 19 StrictMode's dev-only double-invoke of
    // effects. Quill's snow theme also inserts its toolbar as a DOM
    // *sibling* of the element it's attached to (not a child), so it's
    // attached to a throwaway inner div rather than `container` directly —
    // that way cleanup can wipe both the toolbar and editor by clearing
    // `container`'s children in one shot.
    if (!container || quillRef.current) return;
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);
    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder,
      modules: { toolbar: TOOLBAR },
    });
    quillRef.current = quill;
    // dangerouslyPasteHTML inserts directly into a live contenteditable DOM
    // via Quill's own HTML parser, bypassing React entirely — sanitize
    // first so content saved before server-side sanitization existed (or
    // written directly through the API) can't execute on open.
    if (initialValue) quill.clipboard.dangerouslyPasteHTML(DOMPurify.sanitize(initialValue));
    quill.on('text-change', () => {
      const html = quill.root.innerHTML === '<p><br></p>' ? '' : DOMPurify.sanitize(quill.root.innerHTML);
      onChangeRef.current(html);
    });
    return () => {
      quillRef.current = null;
      container.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally uncontrolled; only re-init on remount (via key)
  }, []);

  return <div className="documents-rich-editor" ref={containerRef} />;
}
