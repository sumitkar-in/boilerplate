import { Clock3, MessageSquare, PanelRightClose, RotateCcw } from 'lucide-react';
import { Button, Textarea } from '@boilerplate/ui-common';
import type { DocumentDetail } from '../api';

export type InspectorPanel = 'comments' | 'history';

export function DocumentInspectorPanel({
  panel,
  detail,
  comment,
  onCommentChange,
  onSaveComment,
  onRestore,
  onClose,
}: {
  panel: InspectorPanel;
  detail: DocumentDetail;
  comment: string;
  onCommentChange: (value: string) => void;
  onSaveComment: () => void;
  onRestore: (revisionId: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className="documents-panel">
      <div className="documents-panel__header">
        <h2>
          {panel === 'comments' ? <MessageSquare size={16} /> : <Clock3 size={16} />}
          {panel === 'comments' ? 'Comments' : 'History'}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close panel">
          <PanelRightClose size={16} />
        </button>
      </div>
      {panel === 'comments' ? (
        <>
          <Textarea label="Add comment" value={comment} rows={3} onChange={(event) => onCommentChange(event.target.value)} />
          <Button variant="ghost" onClick={onSaveComment}>Comment</Button>
          <div className="documents-feed">
            {detail.comments.length === 0 ? (
              <p>No comments yet.</p>
            ) : (
              detail.comments.map((item) => (
                <p key={item.id}>
                  {item.body}
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </p>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="documents-feed">
          {detail.revisions.map((revision) => (
            <p key={revision.id}>
              Version {revision.version}
              <small>{new Date(revision.createdAt).toLocaleString()}</small>
              <button type="button" onClick={() => onRestore(revision.id)}>
                <RotateCcw size={12} /> Restore
              </button>
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}
