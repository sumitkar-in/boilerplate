import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { ConfirmDialog, useToast, Button } from '@boilerplate/ui-common';
import { DayPicker } from 'react-day-picker';
import { enUS, fr, hi } from 'date-fns/locale';
import 'react-day-picker/dist/style.css'; // ensure styles are loaded

import { CalendarList } from '../components/CalendarList';
import {
  DEFAULT_CALENDAR_DATE_SETTINGS,
  eventTouchesTenantDate,
  formatFloatingDate,
  getMonthRange,
  getWeekStartIndex,
  type CalendarDateSettings,
} from '../components/calendarDates';
import { CreateEventDialog } from '../components/CreateEventDialog';
import {
  deleteCalendarEvent,
  exportCalendarIcs,
  listCalendarEvents,
  type CalendarEvent,
} from '../api';
import { apiGetTenantSettings } from '../../../core/api-client';

export function CalendarPage() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dateSettings, setDateSettings] = useState<CalendarDateSettings>(DEFAULT_CALENDAR_DATE_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    apiGetTenantSettings().then(
      (settings) => {
        if (cancelled) return;
        setDateSettings({ ...DEFAULT_CALENDAR_DATE_SETTINGS, ...settings.settings.general });
      },
      () => {
        if (!cancelled) setDateSettings(DEFAULT_CALENDAR_DATE_SETTINGS);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load events for the selected month window
      const { from, to } = getMonthRange(month, dateSettings.weekStartsOn);
      const data = await listCalendarEvents({
        from: from.toISOString(),
        to: to.toISOString(),
        search: search.trim() || undefined,
      });
      setEvents(data);
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dateSettings.weekStartsOn, month, search, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => void loadEvents(), 250);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteCalendarEvent(pendingDelete.id);
      setEvents((prev) => prev.filter((event) => event.id !== pendingDelete.id));
      showToast('Event deleted', 'success');
      setPendingDelete(null);
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete, showToast]);

  const handleExportIcs = async () => {
    try {
      const blob = await exportCalendarIcs();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'calendar.ics';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message, 'error');
    }
  };

  // Filter events for the specifically selected date to show in the list
  const selectedDateEvents = selectedDate
    ? events.filter((event) => eventTouchesTenantDate(event, selectedDate, dateSettings))
    : events;

  return (
    <div className="page calendar-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <CalendarDays size={24} />
            Calendar
          </h1>
          <p className="hint-text">Manage Calendar for the current tenant.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} /> New Event
        </Button>
      </header>
      
      <div className="calendar-page__content">
        <div className="calendar-picker-card">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={month}
            onMonthChange={setMonth}
            locale={getDayPickerLocale(dateSettings.locale)}
            weekStartsOn={getWeekStartIndex(dateSettings.weekStartsOn)}
            className="!m-0"
            modifiers={{
              hasEvent: (date) => events.some((event) => eventTouchesTenantDate(event, date, dateSettings)),
            }}
            modifiersStyles={{
              hasEvent: { fontWeight: 'bold', borderBottom: '2px solid var(--accent)' }
            }}
          />
        </div>
        
        <div className="calendar-events-panel">
          <div className="calendar-events-panel__header">
            <h2>
              {selectedDate
                ? `${formatFloatingDate(selectedDate, dateSettings, { weekday: 'long' })} ${formatFloatingDate(selectedDate, dateSettings)}`
                : 'All Events'}
            </h2>
          </div>
          <div className="calendar-events-panel__body">
            <CalendarList
              events={selectedDateEvents}
              isLoading={isLoading}
              search={search}
              onSearchChange={setSearch}
              onEdit={(event) => console.log('Edit clicked', event)}
              onDelete={setPendingDelete}
              onExportIcs={() => void handleExportIcs()}
              dateSettings={dateSettings}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete event"
        message="Are you sure you want to delete this event?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        isConfirming={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <CreateEventDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => void loadEvents()}
        initialDate={selectedDate || new Date()}
      />
    </div>
  );
}

function getDayPickerLocale(locale: string) {
  if (locale === 'fr') return fr;
  if (locale === 'hi') return hi;
  return enUS;
}
