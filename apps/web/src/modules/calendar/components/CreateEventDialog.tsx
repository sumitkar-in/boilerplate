import { useState, useEffect } from 'react';
import { Plus, X, Users, Clock } from 'lucide-react';
import { Button, useToast } from '@boilerplate/ui-common';
import { createCalendarEvent, checkCalendarAvailability, type BusyBlock } from '../api';
import { apiFetch } from '../../../core/api-client'; // Generic fetch for tenant members

type TenantMember = {
  id: string; // The membership ID or User ID, let's assume it maps to user ID
  userId: string;
  name: string;
  email: string;
};

export function CreateEventDialog({
  isOpen,
  onClose,
  onCreated,
  initialDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate: Date;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [attendees, setAttendees] = useState<TenantMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<TenantMember[]>([]);
  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMembers = async () => {
    try {
      const res = await apiFetch<{ rows: Array<{ id: string; userId?: string; user?: { id: string; name: string; email: string }; name?: string; email?: string }> }>('/tenants/members');
      const members = res.rows.map((row) => ({
        id: row.id,
        userId: row.userId || row.user?.id || row.id,
        name: row.user?.name || row.name || 'Unknown',
        email: row.user?.email || row.email || '',
      }));
      setAvailableMembers(members);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const start = new Date(initialDate);
      start.setHours(9, 0, 0, 0); // Default to 9 AM
      const end = new Date(initialDate);
      end.setHours(10, 0, 0, 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartAt(start.toISOString().slice(0, 16));
       
      setEndAt(end.toISOString().slice(0, 16));
       
      setTitle('');
       
      setDescription('');
       
      setAttendees([]);
      void loadMembers();
    }
   
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (attendees.length > 0 && startAt) {
      const from = new Date(startAt);
      from.setHours(0, 0, 0, 0); // Check whole day for timeline
      const to = new Date(from);
      to.setDate(to.getDate() + 1);

      checkCalendarAvailability({
        userIds: attendees.map((a) => a.userId),
        from: from.toISOString(),
        to: to.toISOString(),
      })
        .then(setBusyBlocks)
        .catch(console.error);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusyBlocks([]);
    }
  }, [attendees, startAt]);

  const handleCreate = async () => {
    if (!title || !startAt || !endAt) {
      showToast('Title, start, and end times are required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createCalendarEvent({
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        visibility,
        attendees: attendees.map((a) => ({
          userId: a.userId,
          email: a.email,
          name: a.name,
        })),
      });
      showToast('Event created successfully', 'success');
      onCreated();
      onClose();
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const toggleAttendee = (member: TenantMember) => {
    if (attendees.find((a) => a.userId === member.userId)) {
      setAttendees(attendees.filter((a) => a.userId !== member.userId));
    } else {
      setAttendees([...attendees, member]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Plus size={20} /> Create Event
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event Title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                className="w-full p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                className="w-full p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select
                className="w-full p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-md font-bold mb-4 flex items-center gap-2">
              <Users size={18} /> Attendees & Availability
            </h3>
            
            <div className="flex gap-4">
              <div className="flex-1 border rounded-md dark:border-gray-700 p-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold mb-2 text-gray-500 uppercase">Select Members</p>
                {availableMembers.map((member) => {
                  const isSelected = attendees.some((a) => a.userId === member.userId);
                  return (
                    <button
                      key={member.userId}
                      type="button"
                      className={`w-full text-left p-2 text-sm rounded-md mb-1 transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => toggleAttendee(member)}
                    >
                      {member.name} ({member.email})
                    </button>
                  );
                })}
              </div>
              
              <div className="flex-1 flex flex-col border rounded-md dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs font-semibold mb-4 text-gray-500 uppercase flex justify-between items-center">
                  <span>Timeline (9 AM - 6 PM)</span>
                  <Clock size={14} />
                </p>
                {attendees.length === 0 ? (
                  <div className="text-sm text-gray-500 italic flex-1 flex items-center justify-center text-center">
                    Select attendees to view their availability.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {attendees.map((attendee) => {
                      const userBlocks = busyBlocks.filter((b) => b.userId === attendee.userId);
                      // Very simplistic timeline rendering for working hours (9-18)
                      const dayStart = new Date(startAt);
                      dayStart.setHours(9, 0, 0, 0);
                      const dayEnd = new Date(startAt);
                      dayEnd.setHours(18, 0, 0, 0);
                      const totalMs = dayEnd.getTime() - dayStart.getTime();

                      return (
                        <div key={attendee.userId} className="flex items-center gap-2">
                          <span className="text-xs font-medium w-24 truncate" title={attendee.name}>{attendee.name}</span>
                          <div className="flex-1 h-6 bg-green-100 dark:bg-green-900/30 rounded-md relative overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                            {userBlocks.map((block, i) => {
                              const blockStart = new Date(block.startAt).getTime();
                              const blockEnd = new Date(block.endAt).getTime();
                              
                              let leftPercent = ((blockStart - dayStart.getTime()) / totalMs) * 100;
                              let widthPercent = ((blockEnd - blockStart) / totalMs) * 100;
                              
                              if (leftPercent < 0) {
                                widthPercent += leftPercent;
                                leftPercent = 0;
                              }
                              if (leftPercent + widthPercent > 100) {
                                widthPercent = 100 - leftPercent;
                              }
                              if (leftPercent > 100 || widthPercent <= 0) return null;

                              const isTentative = block.status === 'tentative';

                              return (
                                <div
                                  key={i}
                                  className={`absolute top-0 bottom-0 ${isTentative ? 'bg-orange-300 dark:bg-orange-600' : 'bg-red-400 dark:bg-red-600'}`}
                                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                                  title={isTentative ? 'Tentative' : 'Busy'}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </div>
    </div>
  );
}
