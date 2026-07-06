import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, asc, eq, gte, ilike, lte, ne, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { QueryCalendarEventsDto } from './dto/query-calendar-events.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { calendarEvent } from './entities/calendar-event';
import { calendarAttendee } from './entities/calendar-attendee';
import { randomUUID } from 'crypto';

@Injectable()
export class CalendarService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async listEvents(tenant: TenantContext, query: QueryCalendarEventsDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const conditions: SQL[] = [];
      if (query.from && query.to) {
        // Events that overlap with the [from, to] window
        conditions.push(
          and(
            lte(calendarEvent.startAt, new Date(query.to)),
            gte(calendarEvent.endAt, new Date(query.from)),
          )!,
        );
      } else if (query.from) {
        conditions.push(gte(calendarEvent.startAt, new Date(query.from)));
      } else if (query.to) {
        conditions.push(lte(calendarEvent.endAt, new Date(query.to)));
      }
      if (query.search) {
        const like = `%${query.search}%`;
        const matchesSearch = or(
          ilike(calendarEvent.title, like),
          ilike(calendarEvent.description, like),
        )!;
        conditions.push(
          or(
            and(eq(calendarEvent.ownerUserId, tenant.userId), matchesSearch),
            and(eq(calendarEvent.visibility, 'public'), matchesSearch),
            and(
              eq(calendarEvent.visibility, 'private'),
              ne(calendarEvent.ownerUserId, tenant.userId),
            ),
          )!,
        );
      }

      const events = await db
        .select()
        .from(calendarEvent)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(calendarEvent.startAt));

      const visibleEventIds = events
        .filter(
          (ev) =>
            ev.ownerUserId === tenant.userId || ev.visibility === 'public',
        )
        .map((ev) => ev.id);
      const attendees =
        visibleEventIds.length > 0
          ? await db
              .select()
              .from(calendarAttendee)
              .where(
                or(
                  ...visibleEventIds.map((id) =>
                    eq(calendarAttendee.eventId, id),
                  ),
                ),
              )
          : [];

      return events.map((ev) => ({
        ...this.maskPrivateEvent(tenant, ev),
        isOwner: ev.ownerUserId === tenant.userId,
        isMasked:
          ev.ownerUserId !== tenant.userId && ev.visibility === 'private',
        attendees:
          ev.ownerUserId === tenant.userId || ev.visibility === 'public'
            ? attendees.filter((a) => a.eventId === ev.id)
            : [],
      }));
    });
  }

  async checkAvailability(tenant: TenantContext, dto: CheckAvailabilityDto) {
    if (!dto.userIds?.length) return [];

    return this.tenantDb.withTenantDb(tenant, async (db) => {
      // Find all events that overlap the from/to window
      const events = await db
        .select()
        .from(calendarEvent)
        .leftJoin(
          calendarAttendee,
          eq(calendarAttendee.eventId, calendarEvent.id),
        )
        .where(
          and(
            lte(calendarEvent.startAt, new Date(dto.to)),
            gte(calendarEvent.endAt, new Date(dto.from)),
            or(
              // Event owned by one of the requested users
              ...dto.userIds.map((uid) => eq(calendarEvent.ownerUserId, uid)),
              // OR one of the requested users is an attendee
              ...dto.userIds.map((uid) => eq(calendarAttendee.userId, uid)),
            ),
          ),
        );

      // Return simplified busy blocks per user
      const busyBlocks: Array<{
        userId: string;
        startAt: Date;
        endAt: Date;
        status: string;
      }> = [];
      const seen = new Set<string>();

      for (const row of events) {
        const ev = row.calendar_events;
        const attendee = row.calendar_attendees;

        // If owner is in the requested userIds, they are busy
        if (dto.userIds.includes(ev.ownerUserId)) {
          const key = `${ev.ownerUserId}-${ev.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            busyBlocks.push({
              userId: ev.ownerUserId,
              startAt: ev.startAt,
              endAt: ev.endAt,
              status: ev.status === 'confirmed' ? 'busy' : 'tentative',
            });
          }
        }

        // If attendee is in the requested userIds, they are busy
        if (attendee?.userId && dto.userIds.includes(attendee.userId)) {
          const key = `${attendee.userId}-${ev.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            busyBlocks.push({
              userId: attendee.userId,
              startAt: ev.startAt,
              endAt: ev.endAt,
              status:
                attendee.status === 'declined'
                  ? 'free'
                  : ev.status === 'confirmed'
                    ? 'busy'
                    : 'tentative',
            });
          }
        }
      }

      // Filter out 'free' blocks
      return busyBlocks.filter((b) => b.status !== 'free');
    });
  }

  async findOne(tenant: TenantContext, id: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [ev] = await db
        .select()
        .from(calendarEvent)
        .where(eq(calendarEvent.id, id))
        .limit(1);
      if (!ev) throw new NotFoundException('Calendar event not found');
      if (ev.ownerUserId !== tenant.userId && ev.visibility !== 'public') {
        return {
          ...this.maskPrivateEvent(tenant, ev),
          isOwner: false,
          isMasked: true,
          attendees: [],
        };
      }
      const attendees = await db
        .select()
        .from(calendarAttendee)
        .where(eq(calendarAttendee.eventId, id));
      return {
        ...ev,
        isOwner: ev.ownerUserId === tenant.userId,
        isMasked: false,
        attendees,
      };
    });
  }

  async create(tenant: TenantContext, dto: CreateCalendarEventDto) {
    const { attendees: attendeeInputs, ...eventData } = dto;
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [ev] = await db
        .insert(calendarEvent)
        .values({
          ownerUserId: tenant.userId,
          title: eventData.title,
          description: eventData.description ?? '',
          type: eventData.type ?? 'event',
          status: eventData.status ?? 'confirmed',
          visibility: eventData.visibility ?? 'private',
          startAt: new Date(eventData.startAt),
          endAt: new Date(eventData.endAt),
          allDay: eventData.allDay ?? false,
          location: eventData.location ?? '',
          meetingLink: eventData.meetingLink ?? '',
          rrule: eventData.rrule,
          color: eventData.color,
          icsUid: `${randomUUID()}@boilerplate`,
        })
        .returning();

      const attendees: (typeof calendarAttendee.$inferSelect)[] = [];
      if (attendeeInputs?.length) {
        const inserted = await db
          .insert(calendarAttendee)
          .values(
            attendeeInputs.map((a) => ({
              eventId: ev.id,
              userId: a.userId,
              employeeId: a.employeeId,
              email: a.email,
              name: a.name ?? '',
              status: 'pending' as const,
            })),
          )
          .returning();
        attendees.push(...inserted);
      }
      return { ...ev, isOwner: true, isMasked: false, attendees };
    });
  }

  async update(tenant: TenantContext, id: string, dto: UpdateCalendarEventDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [existing] = await db
        .select({ ownerUserId: calendarEvent.ownerUserId })
        .from(calendarEvent)
        .where(eq(calendarEvent.id, id))
        .limit(1);
      if (!existing) throw new NotFoundException('Calendar event not found');
      if (existing.ownerUserId !== tenant.userId) {
        throw new ForbiddenException('Access denied');
      }

      const { attendees: attendeeInputs, ...rest } = dto;
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (rest.title !== undefined) patch.title = rest.title;
      if (rest.description !== undefined) patch.description = rest.description;
      if (rest.type !== undefined) patch.type = rest.type;
      if (rest.status !== undefined) patch.status = rest.status;
      if (rest.visibility !== undefined) patch.visibility = rest.visibility;
      if (rest.startAt !== undefined) patch.startAt = new Date(rest.startAt);
      if (rest.endAt !== undefined) patch.endAt = new Date(rest.endAt);
      if (rest.allDay !== undefined) patch.allDay = rest.allDay;
      if (rest.location !== undefined) patch.location = rest.location;
      if (rest.meetingLink !== undefined) patch.meetingLink = rest.meetingLink;
      if (rest.rrule !== undefined) patch.rrule = rest.rrule;
      if (rest.color !== undefined) patch.color = rest.color;

      const [updated] = await db
        .update(calendarEvent)
        .set(patch)
        .where(eq(calendarEvent.id, id))
        .returning();

      if (attendeeInputs !== undefined) {
        await db
          .delete(calendarAttendee)
          .where(eq(calendarAttendee.eventId, id));
        if (attendeeInputs.length > 0) {
          await db.insert(calendarAttendee).values(
            attendeeInputs.map((a) => ({
              eventId: id,
              userId: a.userId,
              employeeId: a.employeeId,
              email: a.email,
              name: a.name ?? '',
              status: 'pending' as const,
            })),
          );
        }
      }

      const attendees = await db
        .select()
        .from(calendarAttendee)
        .where(eq(calendarAttendee.eventId, id));

      return { ...updated, isOwner: true, isMasked: false, attendees };
    });
  }

  async remove(tenant: TenantContext, id: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [existing] = await db
        .select({ ownerUserId: calendarEvent.ownerUserId })
        .from(calendarEvent)
        .where(eq(calendarEvent.id, id))
        .limit(1);
      if (!existing) throw new NotFoundException('Calendar event not found');
      if (existing.ownerUserId !== tenant.userId) {
        throw new ForbiddenException('Access denied');
      }
      await db.delete(calendarEvent).where(eq(calendarEvent.id, id));
      return { ok: true };
    });
  }

  /** Export all user's events as ICS content string */
  async exportIcs(tenant: TenantContext): Promise<string> {
    const events = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .select()
        .from(calendarEvent)
        .where(eq(calendarEvent.ownerUserId, tenant.userId)),
    );

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Boilerplate//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const ev of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.icsUid ?? ev.id}`);
      lines.push(`DTSTAMP:${toIcsDate(ev.createdAt)}`);
      if (ev.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${toIcsDateOnly(ev.startAt)}`);
        lines.push(`DTEND;VALUE=DATE:${toIcsDateOnly(ev.endAt)}`);
      } else {
        lines.push(`DTSTART:${toIcsDate(ev.startAt)}`);
        lines.push(`DTEND:${toIcsDate(ev.endAt)}`);
      }
      lines.push(`SUMMARY:${foldIcsValue(ev.title)}`);
      if (ev.description)
        lines.push(`DESCRIPTION:${foldIcsValue(ev.description)}`);
      if (ev.location) lines.push(`LOCATION:${foldIcsValue(ev.location)}`);
      if (ev.meetingLink) lines.push(`URL:${ev.meetingLink}`);
      if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
      lines.push(`STATUS:${ev.status.toUpperCase()}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /** Import events from ICS content string */
  async importIcs(tenant: TenantContext, icsContent: string) {
    const vevents = parseVEvents(icsContent);
    if (!vevents.length) return { imported: 0 };

    await this.tenantDb.withTenantDb(tenant, async (db) => {
      for (const vevent of vevents) {
        const startAt = parseIcsDate(
          vevent['DTSTART'] ?? vevent['DTSTART;VALUE=DATE'],
        );
        const endAt = parseIcsDate(
          vevent['DTEND'] ?? vevent['DTEND;VALUE=DATE'],
        );
        if (!startAt || !endAt) continue;
        const allDay = !!vevent['DTSTART;VALUE=DATE'];
        await db
          .insert(calendarEvent)
          .values({
            ownerUserId: tenant.userId,
            title: vevent['SUMMARY'] ?? 'Imported event',
            description: vevent['DESCRIPTION'] ?? '',
            type: 'event' as const,
            status: 'confirmed' as const,
            visibility: 'private' as const,
            startAt,
            endAt,
            allDay,
            location: vevent['LOCATION'] ?? '',
            meetingLink: vevent['URL'] ?? '',
            rrule: vevent['RRULE'],
            icsUid: vevent['UID'] ?? `${randomUUID()}@boilerplate`,
            color: undefined,
          })
          .onConflictDoNothing();
      }
    });
    return { imported: vevents.length };
  }

  private maskPrivateEvent(
    tenant: TenantContext,
    ev: typeof calendarEvent.$inferSelect,
  ): typeof calendarEvent.$inferSelect {
    if (ev.ownerUserId === tenant.userId || ev.visibility === 'public') {
      return ev;
    }

    return {
      ...ev,
      title: 'Blocked',
      description: '',
      type: 'block',
      location: '',
      meetingLink: '',
      color: null,
      rrule: null,
      metadata: {},
    };
  }
}

/* ---------- ICS helper utilities ---------- */

function toIcsDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function toIcsDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function foldIcsValue(value: string): string {
  return value.replace(/\n/g, '\\n').replace(/,/g, '\\,');
}

/** Very lightweight ICS VEVENT parser (not a full RFC 5545 parser) */
function parseVEvents(ics: string): Record<string, string>[] {
  const events: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const rawLine of ics.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).toUpperCase();
        const value = line
          .slice(colonIdx + 1)
          .replace(/\\n/g, '\n')
          .replace(/\\,/g, ',');
        current[key] = value;
      }
    }
  }
  return events;
}

function parseIcsDate(val: string | undefined): Date | null {
  if (!val) return null;
  // e.g. 20240101T120000Z or 20240101
  if (val.length === 8) {
    return new Date(
      `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}T00:00:00Z`,
    );
  }
  const normalized = val
    .replace(/^(\d{8})T(\d{6})Z?$/, '$1T$2Z')
    .replace(/^(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
    .replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})/, '$1T$2:$3:$4');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}
