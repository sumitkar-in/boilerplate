import { Input, Select } from '@boilerplate/ui-common';
import type { DocumentDetail, DocumentFormat } from '../api';
import { RichTextEditor } from './RichTextEditor';

export function DocumentEditor({ draft, onChange }: {
  draft: DocumentDetail;
  onChange: (draft: DocumentDetail) => void;
}) {
  return (
    <section className="documents-editor" aria-label="Edit document">
      <Input
        className="documents-title-input"
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
        placeholder="Untitled"
      />
      <div className="documents-editor__row">
        <Select
          label="Format"
          value={draft.format}
          options={[{ value: 'markdown', label: 'Markdown' }, { value: 'rich_text', label: 'Rich text' }]}
          onChange={(event) => onChange({ ...draft, format: event.target.value as DocumentFormat })}
        />
        <Input
          label="Labels"
          value={draft.labels.join(', ')}
          onChange={(event) => onChange({ ...draft, labels: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
          placeholder="policy, onboarding"
        />
      </div>
      {draft.format === 'rich_text' ? (
        <RichTextEditor
          key={draft.id}
          initialValue={draft.content}
          onChange={(html) => onChange({ ...draft, content: html })}
          placeholder="Start writing..."
        />
      ) : (
        <textarea
          className="documents-markdown-editor"
          value={draft.content}
          onChange={(event) => onChange({ ...draft, content: event.target.value })}
          placeholder="Type / for ideas, use Markdown headings, lists, and code."
        />
      )}
    </section>
  );
}
