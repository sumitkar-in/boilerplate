import { Trash2 } from 'lucide-react';
import { Button } from '@boilerplate/ui-common';
import type { BpqlRow, BpqlTable } from '../api';

function formatBpqlValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function BpqlDataTable({ table, rows, onEdit, onDelete }: {
  table: BpqlTable;
  rows: BpqlRow[];
  onEdit: (row: BpqlRow) => void;
  onDelete: (row: BpqlRow) => void;
}) {
  return (
    <div className="bpql-data-wrap">
      <table className="bpql-data-table">
        <thead>
          <tr>
            {table.fields.map((field) => <th key={field.key}>{field.label}</th>)}
            <th>Updated</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {table.fields.map((field) => <td key={field.key}>{formatBpqlValue(row.data[field.key])}</td>)}
              <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
              <td>
                <div className="ui-actions">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(row)}><Trash2 size={14} /></Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={table.fields.length + 2}>No rows match this table.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
