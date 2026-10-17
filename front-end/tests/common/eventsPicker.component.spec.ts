import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsPickerComponent } from '@common/eventsPicker.component';
import { GAEventsService } from '@tabs/configurations/events/events.service';
import { GAEvent, GAEventAttached } from '@models/event.model';

describe('EventsPickerComponent', () => {
  let component: EventsPickerComponent;
  let mockEventsService: Partial<GAEventsService>;

  const mockEvents: GAEvent[] = [
    { eventId: 'event-1', name: 'October GA 2026' } as GAEvent,
    { eventId: 'event-2', name: 'Spring GA 2027' } as GAEvent
  ];

  beforeEach(() => {
    mockEventsService = {
      getList: vi.fn().mockResolvedValue(mockEvents)
    };
    component = new EventsPickerComponent(mockEventsService as GAEventsService);
  });

  it('should create and load events on ngOnInit', async () => {
    expect(component).toBeDefined();
    await component.ngOnInit();
    expect(mockEventsService.getList).toHaveBeenCalled();
    expect(component.events).toEqual(mockEvents);
  });

  it('should compare events by eventId', () => {
    const e1 = { eventId: 'event-1', name: 'Event 1' } as GAEventAttached;
    const e2 = { eventId: 'event-1', name: 'Event 1 Dup' } as GAEventAttached;
    const e3 = { eventId: 'event-2', name: 'Event 2' } as GAEventAttached;

    expect(component.compareWithEvent(e1, e2)).toBe(true);
    expect(component.compareWithEvent(e1, e3)).toBe(false);
    expect(component.compareWithEvent(null as any, null as any)).toBe(true);
    expect(component.compareWithEvent(e1, null as any)).toBe(false);
  });
});
