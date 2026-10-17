import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopicsFilterByStatus, TopicsService, TopicsSortBy } from '@tabs/topics/topics.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Topic, TopicTypes } from '@models/topic.model';
import { Opportunity } from '@models/opportunity.model';
import { Application } from '@models/application.model';
import { TopicCategoryAttached } from '@models/category.model';
import { GAEventAttached } from '@models/event.model';

describe('TopicsService', () => {
  let service: TopicsService;
  let mockApi: Partial<IDEAApiService>;

  const mockTopicsData: Partial<Topic>[] = [
    {
      topicId: 'topic-1',
      name: 'President Question Round',
      content: 'Discussion about the presidential role',
      category: { categoryId: 'cat-board', name: 'Board Member', color: 'primary' } as any,
      event: { eventId: 'event-oct', name: 'October GA 2026' } as any,
      subjects: [{ id: 'user-1', name: 'Elena Michael' }] as any,
      type: TopicTypes.STANDARD,
      createdAt: '2026-10-01T10:00:00.000Z',
      publishedSince: '2026-10-01T10:00:00.000Z',
      closedAt: undefined,
      archivedAt: undefined,
      numOfQuestions: 5,
      isDraft: () => false,
      isArchived: () => false,
      isClosed: () => false
    },
    {
      topicId: 'topic-2',
      name: 'Budget Presentation',
      content: 'Financial budget details',
      category: { categoryId: 'cat-statutory', name: 'Statutory Document', color: 'secondary' } as any,
      event: { eventId: 'event-oct', name: 'October GA 2026' } as any,
      subjects: [{ id: 'user-2', name: 'Pascal Lessig' }] as any,
      type: TopicTypes.LIVE,
      createdAt: '2026-10-02T10:00:00.000Z',
      publishedSince: '2026-10-02T10:00:00.000Z',
      closedAt: '2026-10-03T10:00:00.000Z',
      archivedAt: undefined,
      numOfQuestions: 10,
      isDraft: () => false,
      isArchived: () => false,
      isClosed: () => true
    },
    {
      topicId: 'topic-3',
      name: 'Draft Proposal',
      content: 'Draft content',
      category: { categoryId: 'cat-statutory', name: 'Statutory Document', color: 'secondary' } as any,
      event: { eventId: 'event-nov', name: 'November GA 2026' } as any,
      subjects: [],
      type: TopicTypes.STANDARD,
      createdAt: '2026-10-03T10:00:00.000Z',
      publishedSince: undefined,
      closedAt: undefined,
      archivedAt: undefined,
      numOfQuestions: 0,
      isDraft: () => true,
      isArchived: () => false,
      isClosed: () => false
    }
  ];

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn().mockResolvedValue(mockTopicsData),
      postResource: vi.fn().mockResolvedValue(mockTopicsData[0]),
      putResource: vi.fn().mockResolvedValue(mockTopicsData[0]),
      patchResource: vi.fn().mockResolvedValue(mockTopicsData[0]),
      deleteResource: vi.fn().mockResolvedValue(undefined)
    };
    service = new TopicsService(mockApi as IDEAApiService);
  });

  it('should load active topics from API when cache is empty', async () => {
    const result = await service.getActiveList();
    expect(mockApi.getResource).toHaveBeenCalledWith('topics', { params: { archived: false } });
    expect(result).toHaveLength(3);
  });

  it('should use cache on subsequent calls without force', async () => {
    await service.getActiveList();
    await service.getActiveList();
    expect(mockApi.getResource).toHaveBeenCalledTimes(1);
  });

  it('should re-fetch when force=true', async () => {
    await service.getActiveList();
    await service.getActiveList({ force: true });
    expect(mockApi.getResource).toHaveBeenCalledTimes(2);
  });

  it('should filter by categoryId, eventId, and search keyword', async () => {
    const resultCat = await service.getActiveList({ categoryId: 'cat-board' });
    expect(resultCat).toHaveLength(1);
    expect(resultCat![0].topicId).toBe('topic-1');

    const resultEvt = await service.getActiveList({ eventId: 'event-nov' });
    expect(resultEvt).toHaveLength(1);
    expect(resultEvt![0].topicId).toBe('topic-3');

    const resultSearch = await service.getActiveList({ search: 'Budget' });
    expect(resultSearch).toHaveLength(1);
    expect(resultSearch![0].name).toBe('Budget Presentation');
  });

  it('should filter by status and type', async () => {
    const drafts = await service.getActiveList({ status: TopicsFilterByStatus.DRAFT });
    expect(drafts).toHaveLength(1);
    expect(drafts![0].topicId).toBe('topic-3');

    const open = await service.getActiveList({ status: TopicsFilterByStatus.OPEN });
    expect(open).toHaveLength(1);
    expect(open![0].topicId).toBe('topic-1');

    const closed = await service.getActiveList({ status: TopicsFilterByStatus.CLOSED });
    expect(closed).toHaveLength(1);
    expect(closed![0].topicId).toBe('topic-2');

    const liveOnly = await service.getActiveList({ type: TopicTypes.LIVE });
    expect(liveOnly).toHaveLength(1);
    expect(liveOnly![0].topicId).toBe('topic-2');
  });

  it('should sort topics by creation date and activity', async () => {
    const desc = await service.getActiveList({ sortBy: TopicsSortBy.CREATED_DATE_DESC });
    expect(desc![0].topicId).toBe('topic-3');

    const asc = await service.getActiveList({ sortBy: TopicsSortBy.CREATED_DATE_ASC });
    expect(asc![0].topicId).toBe('topic-1');

    const actAsc = await service.getActiveList({ sortBy: TopicsSortBy.ACTIVITY_ASC });
    expect(actAsc).toBeDefined();

    const actDesc = await service.getActiveList({ sortBy: TopicsSortBy.ACTIVITY_DESC });
    expect(actDesc).toBeDefined();

    // Test with > 24 topics to trigger pagination slicing
    const manyTopics = Array.from({ length: 30 }, (_, i) => ({
      topicId: `topic-${i}`,
      name: `Topic ${i}`,
      category: { categoryId: 'cat-1', name: 'Cat' },
      event: { eventId: 'ev-1', name: 'Ev' },
      subjects: [],
      createdAt: `2026-10-${String((i % 25) + 1).padStart(2, '0')}`,
      type: i % 2 === 0 ? TopicTypes.LIVE : TopicTypes.STANDARD,
      isClosed: () => i % 4 === 0
    }));
    (mockApi.getResource as any).mockResolvedValueOnce(manyTopics);
    const paginatedWithId = await service.getActiveList({
      force: true,
      withPagination: true,
      startPaginationAfterId: 'topic-5'
    });
    expect(paginatedWithId!.length).toBe(5 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getActiveList({
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);
  });

  it('should get archived list with filters and sorting', async () => {
    const archivedData = [
      { topicId: 'arc-1', name: 'Old Topic 1', createdAt: '2024-01-01', numOfQuestions: 2 },
      { topicId: 'arc-2', name: 'Old Topic 2', createdAt: '2024-02-01', numOfQuestions: 8 }
    ];
    (mockApi.getResource as any).mockResolvedValueOnce(archivedData);

    const result = await service.getArchivedList({
      force: true,
      categoryId: 'cat-board',
      eventId: 'event-oct',
      sortBy: TopicsSortBy.CREATED_DATE_ASC,
      withPagination: true,
      startPaginationAfterId: 'arc-1'
    });
    expect(result).toHaveLength(2);
    expect(mockApi.getResource).toHaveBeenCalledWith('topics', {
      params: {
        archived: true,
        categoryId: 'cat-board',
        eventId: 'event-oct'
      }
    });

    const desc = await service.getArchivedList({ sortBy: TopicsSortBy.CREATED_DATE_DESC });
    expect(desc![0].topicId).toBe('arc-2');

    const actAsc = await service.getArchivedList({ sortBy: TopicsSortBy.ACTIVITY_ASC });
    expect(actAsc![0].topicId).toBe('arc-1');

    const actDesc = await service.getArchivedList({ sortBy: TopicsSortBy.ACTIVITY_DESC });
    expect(actDesc![0].topicId).toBe('arc-2');

    // Archived pagination test with > 24 items
    const manyArchived = Array.from({ length: 30 }, (_, i) => ({
      topicId: `arc-${i}`,
      name: `Old Topic ${i}`,
      createdAt: `2024-01-${String((i % 25) + 1).padStart(2, '0')}`,
      numOfQuestions: i
    }));
    (mockApi.getResource as any).mockResolvedValueOnce(manyArchived);
    const paginatedWithId = await service.getArchivedList({
      force: true,
      withPagination: true,
      startPaginationAfterId: 'arc-3'
    });
    expect(paginatedWithId!.length).toBe(3 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getArchivedList({
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);
  });

  it('should handle CRUD and action operations', async () => {
    const topic = new Topic({ topicId: 'topic-1', name: 'Topic 1' });

    (mockApi.getResource as any).mockResolvedValueOnce(mockTopicsData[0]);
    const fetched = await service.getById('topic-1');
    expect(fetched.topicId).toBe('topic-1');

    const inserted = await service.insert(topic);
    expect(inserted.topicId).toBe('topic-1');

    const updated = await service.update(topic);
    expect(updated.topicId).toBe('topic-1');

    const opp = new Opportunity({ opportunityId: 'opp-1' });
    const app = new Application({ applicationId: 'app-1' });
    const cat = new TopicCategoryAttached({ categoryId: 'cat-1', name: 'Cat' });
    const evt = new GAEventAttached({ eventId: 'ev-1', name: 'Ev' });
    const fromApp = await service.insertFromApplicationToOpportunity(opp, app, cat, evt);
    expect(fromApp).toBeDefined();

    await service.open(topic);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['topics', 'topic-1'], { body: { action: 'OPEN' } });

    await service.close(topic);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['topics', 'topic-1'], { body: { action: 'CLOSE' } });

    await service.archive(topic);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['topics', 'topic-1'], { body: { action: 'ARCHIVE' } });

    await service.unarchive(topic);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['topics', 'topic-1'], { body: { action: 'UNARCHIVE' } });

    await service.delete(topic);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['topics', 'topic-1']);

    (mockApi.getResource as any).mockResolvedValueOnce([mockTopicsData[0]]);
    const related = await service.getRelated(topic);
    expect(related).toHaveLength(1);

    await service.linkByIds('topic-1', 'topic-2');
    expect(mockApi.postResource).toHaveBeenCalledWith(['topics', 'topic-1', 'related', 'topic-2']);

    await service.unlinkByIds('topic-1', 'topic-2');
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['topics', 'topic-1', 'related', 'topic-2']);

    (mockApi.patchResource as any).mockResolvedValueOnce(['m-1', 'm-2']);
    const upvotes = await service.userMessagesUpvotesForTopic(topic);
    expect(upvotes).toEqual({ 'm-1': true, 'm-2': true });
  });
});
