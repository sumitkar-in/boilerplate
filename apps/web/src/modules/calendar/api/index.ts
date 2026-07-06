import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type CalendarAttendee = {
  id: string;
  eventId: string;
  userId?: string;
  employeeId?: string;
  email: string;
  name: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
};

export type CalendarEvent = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  type: 'meeting' | 'event' | 'reminder' | 'block';
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private';
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string;
  meetingLink: string;
  rrule?: string;
  color?: string;
  attendees: CalendarAttendee[];
  isOwner?: boolean;
  isMasked?: boolean;
};

export type CalendarEventInput = {
  title: string;
  description?: string;
  type?: 'meeting' | 'event' | 'reminder' | 'block';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'public' | 'private';
  startAt: string;
  endAt: string;
  allDay?: boolean;
  location?: string;
  meetingLink?: string;
  rrule?: string;
  color?: string;
  attendees?: Array<{
    userId?: string;
    employeeId?: string;
    email: string;
    name?: string;
  }>;
};

export type QueryCalendarEventsDto = {
  from?: string; // ISO string
  to?: string;   // ISO string
  search?: string;
};

export function listCalendarEvents(query: QueryCalendarEventsDto = {}): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>(`/calendar${buildQueryString(query)}`);
}

export function getCalendarEvent(id: string): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/calendar/${id}`);
}

export function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/calendar', { method: 'POST', body: input });
}

export function updateCalendarEvent(id: string, input: Partial<CalendarEventInput>): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/calendar/${id}`, { method: 'PATCH', body: input });
}

export function deleteCalendarEvent(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/calendar/${id}`, { method: 'DELETE' });
}

export function exportCalendarIcs(): Promise<Blob> {
  return apiFetch<Blob>('/calendar/export.ics');
}

export type CheckAvailabilityInput = {
  userIds: string[];
  from: string;
  to: string;
};

export type BusyBlock = {
  userId: string;
  startAt: string;
  endAt: string;
  status: string;
};

export function checkCalendarAvailability(input: CheckAvailabilityInput): Promise<BusyBlock[]> {
  return apiFetch<BusyBlock[]>('/calendar/availability', { method: 'POST', body: input });
}
