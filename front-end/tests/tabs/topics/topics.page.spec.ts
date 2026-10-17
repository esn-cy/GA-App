import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopicsPage } from '@tabs/topics/topics.page';
import { TopicsService, TopicsSortBy } from '@tabs/topics/topics.service';
import { TopicCategoryService } from '@tabs/configurations/categories/categories.service';
import { GAEventsService } from '@tabs/configurations/events/events.service';
import { AppService } from '@app/app.service';
import { IDEAActionSheetController, IDEATranslationsService } from '@idea-ionic/common';
import { Topic, TopicTypes } from '@models/topic.model';

describe('TopicsPage', () => {
  let page: TopicsPage;
  let mockTopicsService: Partial<TopicsService>;
  let mockCategoryService: Partial<TopicCategoryService>;
  let mockEventsService: Partial<GAEventsService>;
  let mockApp: Partial<AppService>;
  let mockActionSheetCtrl: Partial<IDEAActionSheetController>;
  let mockTranslations: Partial<IDEATranslationsService>;

  const mockTopics: Partial<Topic>[] = [
    { topicId: 'topic-1', name: 'Topic 1', type: TopicTypes.STANDARD } as Topic
  ];

  beforeEach(() => {
    mockTopicsService = {
      getActiveList: vi.fn().mockResolvedValue(mockTopics)
    };
    mockCategoryService = {
      getList: vi.fn().mockResolvedValue([{ categoryId: 'cat-1', name: 'Board' } as any])
    };
    mockEventsService = {
      getList: vi.fn().mockResolvedValue([{ eventId: 'event-1', name: 'October GA' } as any])
    };
    mockApp = {
      goToInTabs: vi.fn()
    };
    mockActionSheetCtrl = {};
    mockTranslations = {};

    page = new TopicsPage(
      mockActionSheetCtrl as IDEAActionSheetController,
      mockTranslations as IDEATranslationsService,
      mockTopicsService as TopicsService,
      mockCategoryService as TopicCategoryService,
      mockEventsService as GAEventsService,
      mockApp as AppService
    );
  });

  it('should initialize filters to null by default', () => {
    expect(page.filterByCategory).toBeNull();
    expect(page.filterByEvent).toBeNull();
    expect(page.filterByStatus).toBeNull();
    expect(page.filterByType).toBeNull();
  });

  it('should load topics, categories, and events on ngOnInit', async () => {
    await page.ngOnInit();

    expect(mockTopicsService.getActiveList).toHaveBeenCalledWith({ force: true, withPagination: true });
    expect(mockCategoryService.getList).toHaveBeenCalled();
    expect(mockEventsService.getList).toHaveBeenCalled();
    expect(page.topics).toEqual(mockTopics);
    expect(page.categories).toHaveLength(1);
    expect(page.events).toHaveLength(1);
  });

  it('should pass filters to topics service when filtering', async () => {
    page.filterByCategory = 'cat-1';
    page.filterByEvent = 'event-1';
    await page.filter('search keyword');

    expect(mockTopicsService.getActiveList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'search keyword',
        categoryId: 'cat-1',
        eventId: 'event-1',
        withPagination: true,
        sortBy: TopicsSortBy.CREATED_DATE_DESC
      })
    );
  });

  it('should navigate to topic details on openTopic', () => {
    const topic = { topicId: 'topic-1', type: TopicTypes.STANDARD } as Topic;
    page.openTopic(topic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'topic-1', 'standard']);

    const liveTopic = { topicId: 'topic-2', type: TopicTypes.LIVE } as Topic;
    page.openTopic(liveTopic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'topic-2', 'live']);
  });

  it('should trigger filter on ionViewDidEnter', () => {
    const filterSpy = vi.spyOn(page, 'filter');
    page.ionViewDidEnter();
    expect(filterSpy).toHaveBeenCalledWith(undefined, undefined, true);
  });

  it('should refresh topics on handleRefresh', async () => {
    const mockRefresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(mockRefresher);
    expect(mockTopicsService.getActiveList).toHaveBeenCalled();
    expect(mockRefresher.complete).toHaveBeenCalled();
  });

  it('should paginate when scrollToNextPage is provided in filter', async () => {
    vi.useFakeTimers();
    page.topics = [new Topic({ topicId: 'topic-last', type: TopicTypes.STANDARD })];
    const mockInfiniteScroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;

    await page.filter('test', mockInfiniteScroll);
    expect(mockTopicsService.getActiveList).toHaveBeenCalledWith(
      expect.objectContaining({
        startPaginationAfterId: 'topic-last'
      })
    );
    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should present action sheet and navigate on addTopic', async () => {
    let actionButtons: any[] = [];
    mockActionSheetCtrl.create = vi.fn().mockImplementation(async (opts: any) => {
      actionButtons = opts.buttons;
      return { present: vi.fn().mockResolvedValue(undefined) };
    });
    mockTranslations._ = vi.fn().mockReturnValue('Choose type');

    await page.addTopic();
    expect(mockActionSheetCtrl.create).toHaveBeenCalled();
    expect(actionButtons.length).toBe(3);

    actionButtons[0].handler();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'new-standard', 'manage']);

    actionButtons[1].handler();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'new-live', 'manage']);
  });
});
