import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsPage } from '@tabs/configurations/events/events.page';
import { GAEvent } from '@models/event.model';

describe('EventsPage', () => {
  let page: EventsPage;
  let mockEventsService: any;
  let mockApp: any;

  beforeEach(() => {
    mockEventsService = {
      getList: vi.fn().mockResolvedValue([
        new GAEvent({ eventId: 'ev-1', name: 'General Assembly' })
      ])
    };
    mockApp = {
      goToInTabs: vi.fn()
    };
    page = new EventsPage(mockEventsService, mockApp);
  });

  it('should load events on ionViewDidEnter', async () => {
    await page.ionViewDidEnter();
    expect(mockEventsService.getList).toHaveBeenCalledWith({ force: true, withPagination: true });
    expect(page.events?.length).toBe(1);
  });

  it('should paginate events list', async () => {
    vi.useFakeTimers();
    await page.ionViewDidEnter();
    const scrollMock = { complete: vi.fn() } as any;

    await page.paginate(scrollMock);
    expect(mockEventsService.getList).toHaveBeenCalledWith({
      withPagination: true,
      startPaginationAfterId: 'ev-1'
    });
    vi.advanceTimersByTime(150);
    expect(scrollMock.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should navigate to new and edit event', () => {
    page.addEvent();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['configurations', 'events', 'new']);

    page.openEvent(new GAEvent({ eventId: 'ev-1' }));
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['configurations', 'events', 'ev-1']);
  });
});
