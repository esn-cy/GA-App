import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchivePage } from '@tabs/topics/archive/archive.page';
import { Topic, TopicTypes } from '@models/topic.model';
import { TopicCategory } from '@models/category.model';
import { GAEvent } from '@models/event.model';

describe('Topics ArchivePage', () => {
  let page: ArchivePage;
  let mockLoading: any;
  let mockMessage: any;
  let mockTopics: any;
  let mockCategories: any;
  let mockEvents: any;
  let mockApp: any;

  beforeEach(() => {
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockTopics = {
      getArchivedList: vi.fn().mockResolvedValue([
        new Topic({ topicId: 'top-1', name: 'Archived Topic', type: TopicTypes.STANDARD })
      ])
    };
    mockCategories = {
      getList: vi.fn().mockResolvedValue([new TopicCategory({ categoryId: 'cat-1', name: 'Workshops' })])
    };
    mockEvents = {
      getList: vi.fn().mockResolvedValue([new GAEvent({ eventId: 'ev-1', name: 'Spring GA' })])
    };
    mockApp = {
      goToInTabs: vi.fn()
    };

    page = new ArchivePage(
      mockLoading,
      mockMessage,
      mockTopics,
      mockCategories,
      mockEvents,
      mockApp
    );
  });

  it('should load categories and events on ngOnInit', async () => {
    await page.ngOnInit();
    expect(mockCategories.getList).toHaveBeenCalledWith({ all: true });
    expect(mockEvents.getList).toHaveBeenCalledWith({ all: true });
    expect(page.categories?.length).toBe(1);
    expect(page.events?.length).toBe(1);
  });

  it('should filter archived topics on search and handle search error', async () => {
    await page.search();
    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockTopics.getArchivedList).toHaveBeenCalledWith(expect.objectContaining({
      force: true
    }));
    expect(page.topics?.length).toBe(1);
    expect(mockLoading.hide).toHaveBeenCalled();

    // Search failure
    mockTopics.getArchivedList.mockRejectedValueOnce(new Error('fail'));
    await page.search();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
    expect(mockLoading.hide).toHaveBeenCalledTimes(2);
  });

  it('should paginate with scrollToNextPage in filter', async () => {
    vi.useFakeTimers();
    page.topics = [new Topic({ topicId: 'top-last' })];
    const mockInfiniteScroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;

    await page.filter(false, mockInfiniteScroll);
    expect(mockTopics.getArchivedList).toHaveBeenCalledWith(
      expect.objectContaining({ startPaginationAfterId: 'top-last' })
    );

    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should navigate to topic on openTopic (live and standard)', () => {
    const liveTopic = new Topic({ topicId: 'top-1', type: TopicTypes.LIVE });
    page.openTopic(liveTopic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-1', 'live']);

    const stdTopic = new Topic({ topicId: 'top-2', type: TopicTypes.STANDARD });
    page.openTopic(stdTopic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-2', 'standard']);
  });
});
