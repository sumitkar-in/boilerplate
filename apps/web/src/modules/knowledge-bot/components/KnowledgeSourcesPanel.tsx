import { Database, FileText, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@boilerplate/ui-common';
import type { KnowledgeSource, KnowledgeSourceKind } from '../api';

const sourceKindOptions = [
  { value: 'text', label: 'Text' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API' },
];

export function KnowledgeSourcesPanel({
  sources,
  sourceName,
  sourceKind,
  sourceContent,
  onSourceNameChange,
  onSourceKindChange,
  onSourceContentChange,
  onSaveSource,
  onDeleteSource,
}: {
  sources: KnowledgeSource[];
  sourceName: string;
  sourceKind: KnowledgeSourceKind;
  sourceContent: string;
  onSourceNameChange: (value: string) => void;
  onSourceKindChange: (value: KnowledgeSourceKind) => void;
  onSourceContentChange: (value: string) => void;
  onSaveSource: () => void;
  onDeleteSource: (source: KnowledgeSource) => void;
}) {
  return (
    <section className="knowledge-panel">
      <h2><Database size={16} /> Sources</h2>
      <Input label="Name" value={sourceName} onChange={(event) => onSourceNameChange(event.target.value)} placeholder="Support runbook" />
      <Select label="Type" value={sourceKind} options={sourceKindOptions} onChange={(event) => onSourceKindChange(event.target.value as KnowledgeSourceKind)} />
      <Textarea label="Data" value={sourceContent} rows={7} onChange={(event) => onSourceContentChange(event.target.value)} placeholder="Paste tenant-specific knowledge here" />
      <Button variant="primary" onClick={onSaveSource}><Plus size={16} /> Add source</Button>
      <div className="knowledge-list">
        {sources.map((source) => (
          <p key={source.id}>
            <FileText size={14} />
            <span>{source.name}</span>
            <small>{source.kind}</small>
            <Button variant="ghost" size="sm" onClick={() => onDeleteSource(source)} aria-label={`Delete ${source.name}`}>
              <Trash2 size={14} />
            </Button>
          </p>
        ))}
      </div>
    </section>
  );
}
