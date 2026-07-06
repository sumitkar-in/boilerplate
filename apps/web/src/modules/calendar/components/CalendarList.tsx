import { useMemo } from 'react';
import { Button, AdvancedDataTable, type AdvancedTableColumn } from '@boilerplate/ui-common';
import { CalendarDays, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../api';
import {
  DEFAULT_CALENDAR_DATE_SETTINGS,
  formatTenantTimestamp,
  type CalendarDateSettings,
} from './calendarDates';

export function CalendarList({
  events,
  isLoading,
  search,
  onSearchChange,
  onEdit,
  onDelete,
  onExportIcs,
  dateSettings = DEFAULT_CALENDAR_DATE_SETTINGS,
}: {
  events: CalendarEvent[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onExportIcs: () => void;
  dateSettings?: CalendarDateSettings;
}) {
  const columns = useMemo<AdvancedTableColumn<CalendarEvent>[]>(() => [
    {
      key: 'title',
      title: 'Event',
      getValue: (row) => row.title,
      filterable: false,
      render: (row) => (
        <div>
          <div className="calendar-event-title">{row.isMasked ? 'Blocked' : row.title}</div>
          {!row.isMasked && row.description && <div className="calendar-event-description">{row.description}</div>}
        </div>
      )
    },
    {
      key: 'startAt',
      title: 'Date',
      getValue: (row) => formatTenantTimestamp(row.startAt, dateSettings),
      filterable: false,
    },
    {
      key: 'status',
      title: 'Status',
      getValue: (row) => row.status,
      filterable: false,
      render: (row) => <span style={{ textTransform: 'capitalize' }}>{row.status}</span>
    },
    {
      key: 'visibility',
      title: 'Visibility',
      getValue: (row) => row.isMasked ? 'Private' : row.visibility,
      filterable: false,
      render: (row) => (
        <span className={`calendar-visibility calendar-visibility--${row.visibility}`}>
          {row.isMasked ? 'Private' : row.visibility}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      isAction: true,
      align: 'right',
      render: (row) => row.isOwner === false ? (
        <span className="calendar-readonly-action">View only</span>
      ) : (
        <div className="calendar-list-actions">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
            <Trash2 size={16} color="red" />
          </Button>
        </div>
      )
    }
  ], [dateSettings, onDelete, onEdit]);

  const toolbarActions = (
    <Button variant="outline" size="sm" onClick={onExportIcs}>
      <CalendarDays size={14} />
      Export ICS
    </Button>
  );

  return (
    <AdvancedDataTable
      data={events}
      columns={columns}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      loadingMessage="Loading events..."
      emptyMessage="No events found. Create one to get started!"
      enableToolbar={true}
      toolbarActions={toolbarActions}
      searchPlaceholder="Search events"
      searchValue={search}
      onSearchChange={onSearchChange}
    />
  );
}
