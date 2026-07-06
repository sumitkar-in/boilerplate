import DOMPurify from 'dompurify';
import { Eye } from 'lucide-react';
import type { DocumentDetail } from '../api';
import { markdownToHtml } from '../lib/markdown';

export function DocumentReader({ detail }: { detail: DocumentDetail }) {
  const rawHtml = detail.format === 'markdown' ? markdownToHtml(detail.content) : detail.content;

  return (
    <article className="documents-reader" aria-label="Document reader">
      <div className="documents-reader__meta">
        <span><Eye size={14} /> Reading</span>
        {detail.labels.map((item) => <span key={item}>{item}</span>)}
      </div>
      <h1>{detail.title}</h1>
      <div
        className="documents-preview"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rawHtml) }}
      />
    </article>
  );
}
