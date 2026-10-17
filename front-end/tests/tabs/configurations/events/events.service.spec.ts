import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAEventsService } from '@tabs/configurations/events/events.service';
import { IDEAApiService } from '@idea-ionic/common';
import { GAEvent } from '@models/event.model';

describe('GAEventsService', () => {
  let service: GAEventsService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      patchResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new GAEventsService(mockApi as IDEAApiService);
  });

  it('should load and search events', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { eventId: 'event-1', name: 'Spring Assembly' },
      { eventId: 'event-2', name: 'Autumn Assembly' }
    ]);

    const res = await service.getList({ search: 'Spring' });
    expect(res?.length).toBe(1);
    expect(res?.[0].name).toBe('Spring Assembly');
  });

  it('should paginate events list', async () => {
    const rawEvents = Array.from({ length: 30 }, (_, i) => ({
      eventId: `event-${i}`,
      name: `Event ${i}`
    }));
    (mockApi.getResource as any).mockResolvedValue(rawEvents);

    const page = await service.getList({ withPagination: true });
    expect(page?.length).toBe(24);

    const page2 = await service.getList({ withPagination: true, startPaginationAfterId: 'event-5' });
    expect(page2?.length).toBe(29);
  });

  it('should perform CRUD operations', async () => {
    const event = new GAEvent({ eventId: 'event-1', name: 'Assembly' });
    (mockApi.getResource as any).mockResolvedValue(event);
    (mockApi.postResource as any).mockResolvedValue(event);
    (mockApi.putResource as any).mockResolvedValue(event);

    const fetched = await service.getById('event-1');
    expect(fetched.name).toBe('Assembly');

    await service.insert(event);
    expect(mockApi.postResource).toHaveBeenCalledWith('events', { body: event });

    await service.update(event);
    expect(mockApi.putResource).toHaveBeenCalledWith(['events', 'event-1'], { body: event });

    await service.archive(event);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['events', 'event-1'], { body: { action: 'ARCHIVE' } });

    await service.unarchive(event);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['events', 'event-1'], { body: { action: 'UNARCHIVE' } });

    await service.delete(event);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['events', 'event-1']);
  });
});
