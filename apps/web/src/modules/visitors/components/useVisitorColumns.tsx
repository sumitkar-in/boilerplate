import { useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button, type AdvancedTableColumn } from '@boilerplate/ui-common';
import type { Visitor } from '../api';

export type VisitorColumn = AdvancedTableColumn<Visitor> & { kind: 'builtin' | 'actions' };

export function useVisitorColumns({
  onEdit,
  onDelete,
  onExit,
}: {
  onEdit: (row: Visitor) => void;
  onDelete: (row: Visitor) => void;
  onExit: (id: string) => void;
}): VisitorColumn[] {
  return useMemo<VisitorColumn[]>(() => [
    {
      key: 'name',
      title: 'Name',
      kind: 'builtin',
      getValue: (row) => row.name,
      render: (row) => <strong>{row.name}</strong>,
    },
    {
      key: 'email',
      title: 'Email',
      kind: 'builtin',
      getValue: (row) => row.email,
    },
    {
      key: 'phone',
      title: 'Phone',
      kind: 'builtin',
      getValue: (row) => row.phone,
    },
    {
      key: 'entryTime',
      title: 'Entry Time',
      kind: 'builtin',
      getValue: (row) => new Date(row.entryTime).toLocaleString(),
    },
    {
      key: 'exitTime',
      title: 'Exit Time',
      kind: 'builtin',
      getValue: (row) => row.exitTime ? new Date(row.exitTime).toLocaleString() : '',
      render: (row) => {
        if (row.exitTime) return new Date(row.exitTime).toLocaleString();
        return (
          <Button variant="ghost" size="sm" onClick={() => onExit(row.id)}>
            Mark Exit
          </Button>
        );
      },
    },
    {
      key: 'actions',
      title: '',
      kind: 'actions',
      align: 'right',
      width: '106px',
      isAction: true,
      render: (row) => (
        <div className="ui-actions">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)} title="Edit Visitor">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(row)} title="Delete Visitor">
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [onDelete, onEdit, onExit]);
}
