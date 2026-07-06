import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react';
import { Button } from '@boilerplate/ui-common';
import type { CalendarEvent } from '../api';
import {
  DEFAULT_CALENDAR_DATE_SETTINGS,
  eventTouchesTenantDate,
  formatFloatingDate,
  formatTenantTime,
  getMonthRange,
  getWeekdayLabels,
  toDateKey,
  type CalendarDateSettings,
} from './calendarDates';

type CalendarDay = {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
};

export function CalendarMonthView({
  events,
  month,
  selectedDate,
  onMonthChange,
  onSelectedDateChange,
  dateSettings = DEFAULT_CALENDAR_DATE_SETTINGS,
}: {
  events: CalendarEvent[];
  month: Date;
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
  onSelectedDateChange: (date: Date) => void;
  dateSettings?: CalendarDateSettings;
}) {
  const days = buildCalendarDays(month, events, dateSettings);
  const weekdayLabels = getWeekdayLabels(dateSettings.weekStartsOn, dateSettings.locale);
  const selectedKey = toDateKey(selectedDate);
  const selectedEvents = events
    .filter((event) => eventTouchesTenantDate(event, selectedDate, dateSettings))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  function shiftMonth(delta: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  return (
    <section className="calendar-shell" aria-label="Calendar month view">
      <div className="calendar-toolbar">
        <div>
          <p>Calendar view</p>
          <h2>{formatFloatingDate(month, dateSettings, { month: 'long', year: 'numeric' })}</h2>
        </div>
        <div className="calendar-toolbar__actions">
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-month-grid" role="grid" aria-label={formatFloatingDate(month, dateSettings, { month: 'long', year: 'numeric' })}>
          {weekdayLabels.map((day) => (
            <div key={day} className="calendar-weekday" role="columnheader">
              {day}
            </div>
          ))}
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              className={[
                'calendar-day',
                day.isCurrentMonth ? '' : 'calendar-day--muted',
                day.isToday ? 'calendar-day--today' : '',
                day.key === selectedKey ? 'calendar-day--selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectedDateChange(day.date)}
              role="gridcell"
            >
              <span className="calendar-day__number">{day.date.getDate()}</span>
              <span className="calendar-day__events">
                {day.events.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    className={[
                      'calendar-event-chip',
                      `calendar-event-chip--${event.status}`,
                      event.isMasked ? 'calendar-event-chip--masked' : '',
                    ].filter(Boolean).join(' ')}
                    style={event.color ? { borderLeftColor: event.color } : undefined}
                  >
                    {event.isMasked ? 'Blocked' : event.title}
                  </span>
                ))}
                {day.events.length > 3 && <span className="calendar-event-more">+{day.events.length - 3} more</span>}
              </span>
            </button>
          ))}
        </div>

        <aside className="calendar-agenda" aria-label="Selected day events">
          <div className="calendar-agenda__header">
            <span>{formatFloatingDate(selectedDate, dateSettings, { weekday: 'short' })}</span>
            <strong>{formatFloatingDate(selectedDate, dateSettings, { month: 'short', day: 'numeric' })}</strong>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="calendar-agenda__empty">
              <Plus size={18} />
              <p>No events on this day.</p>
            </div>
          ) : (
            <div className="calendar-agenda__list">
              {selectedEvents.map((event) => (
                <article
                  key={event.id}
                  className={[
                    'calendar-agenda-card',
                    `calendar-agenda-card--${event.status}`,
                    event.isMasked ? 'calendar-agenda-card--masked' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <strong>{event.isMasked ? 'Blocked' : event.title}</strong>
                  <span><Clock size={13} /> {formatEventTime(event, dateSettings)}</span>
                  {!event.isMasked && event.location && <span><MapPin size={13} /> {event.location}</span>}
                  {!event.isMasked && event.description && <p>{event.description}</p>}
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function buildCalendarDays(month: Date, events: CalendarEvent[], dateSettings: CalendarDateSettings): CalendarDay[] {
  const { from } = getMonthRange(month, dateSettings.weekStartsOn);
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() + index);
    const key = toDateKey(date);
    return {
      date,
      key,
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: key === todayKey,
      events: events
        .filter((event) => eventTouchesTenantDate(event, date, dateSettings))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    };
  });
}

function formatEventTime(event: CalendarEvent, dateSettings: CalendarDateSettings) {
  if (event.allDay) return 'All day';
  return `${formatTenantTime(event.startAt, dateSettings)} - ${formatTenantTime(event.endAt, dateSettings)}`;
}
