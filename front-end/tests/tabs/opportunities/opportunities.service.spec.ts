import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpportunitiesService, OpportunitiesSortBy } from '@tabs/opportunities/opportunities.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Opportunity } from '@models/opportunity.model';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let mockApi: Partial<IDEAApiService>;

  const mockOpportunities: Partial<Opportunity>[] = [
    {
      opportunityId: 'opp-1',
      name: 'Main Chair',
      content: 'Call for Main Chair of Spring GA',
      createdAt: '2026-10-01T12:00:00.000Z',
      closedAt: undefined,
      willCloseAt: '2026-11-01T12:00:00.000Z'
    },
    {
      opportunityId: 'opp-2',
      name: 'Secretary',
      content: 'Call for Secretary of Spring GA',
      createdAt: '2026-10-05T12:00:00.000Z',
      closedAt: '2026-10-10T12:00:00.000Z',
      willCloseAt: '2026-10-10T12:00:00.000Z'
    }
  ];

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn().mockResolvedValue(mockOpportunities),
      postResource: vi.fn().mockResolvedValue(mockOpportunities[0]),
      putResource: vi.fn().mockResolvedValue(mockOpportunities[0]),
      patchResource: vi.fn().mockResolvedValue(mockOpportunities[0]),
      deleteResource: vi.fn().mockResolvedValue(undefined)
    };
    service = new OpportunitiesService(mockApi as IDEAApiService);
  });

  it('should load active opportunities and handle caching / force', async () => {
    const list = await service.getActiveList();
    expect(mockApi.getResource).toHaveBeenCalledWith('opportunities');
    expect(list).toHaveLength(2);

    await service.getActiveList();
    expect(mockApi.getResource).toHaveBeenCalledTimes(1);

    await service.getActiveList({ force: true });
    expect(mockApi.getResource).toHaveBeenCalledTimes(2);
  });

  it('should filter by open/closed status and search', async () => {
    const openList = await service.getActiveList({ status: true });
    expect(openList).toHaveLength(1);
    expect(openList![0].opportunityId).toBe('opp-1');

    const closedList = await service.getActiveList({ status: false });
    expect(closedList).toHaveLength(1);
    expect(closedList![0].opportunityId).toBe('opp-2');

    const searchResult = await service.getActiveList({ search: 'Secretary' });
    expect(searchResult).toHaveLength(1);
    expect(searchResult![0].name).toBe('Secretary');
  });

  it('should sort opportunities by created date and closing date', async () => {
    const desc = await service.getActiveList({ sortBy: OpportunitiesSortBy.CREATED_DATE_DESC });
    expect(desc![0].opportunityId).toBe('opp-2');

    const asc = await service.getActiveList({ sortBy: OpportunitiesSortBy.CREATED_DATE_ASC });
    expect(asc![0].opportunityId).toBe('opp-1');

    const closeAsc = await service.getActiveList({ sortBy: OpportunitiesSortBy.CLOSING_DATE_ASC });
    expect(closeAsc).toBeDefined();

    const closeDesc = await service.getActiveList({ sortBy: OpportunitiesSortBy.CLOSING_DATE_DESC });
    expect(closeDesc).toBeDefined();

    // Test with > 24 items for pagination in getActiveList
    const manyOpps = Array.from({ length: 30 }, (_, i) => ({
      opportunityId: `opp-${i}`,
      name: `Opportunity ${i}`,
      content: `Content ${i}`,
      createdAt: `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      closedAt: i % 2 === 0 ? `2026-11-${String(i + 1).padStart(2, '0')}T12:00:00.000Z` : undefined,
      willCloseAt: `2026-12-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`
    }));
    (mockApi.getResource as any).mockResolvedValueOnce(manyOpps);
    const paginatedWithId = await service.getActiveList({
      force: true,
      withPagination: true,
      startPaginationAfterId: 'opp-5'
    });
    expect(paginatedWithId!.length).toBe(5 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getActiveList({
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);
  });

  it('should get archived list from year with sorting and pagination', async () => {
    const archivedData = Array.from({ length: 28 }, (_, i) => ({
      opportunityId: `arc-${i}`,
      name: `Past ${i}`,
      createdAt: `2023-01-${String(i + 1).padStart(2, '0')}`,
      closedAt: i % 2 === 0 ? `2023-02-01` : undefined,
      willCloseAt: `2023-03-01`
    }));
    (mockApi.getResource as any).mockResolvedValueOnce(archivedData);

    const list = await service.getArchivedListFromYear(2023, {
      force: true,
      sortBy: OpportunitiesSortBy.CREATED_DATE_ASC,
      withPagination: true,
      startPaginationAfterId: 'arc-2'
    });
    expect(list!.length).toBe(2 + service.MAX_PAGE_SIZE);
    expect(mockApi.getResource).toHaveBeenCalledWith('opportunities', { params: { archivedFromYear: 2023 } });

    const paginatedWithoutId = await service.getArchivedListFromYear(2023, {
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);

    const desc = await service.getArchivedListFromYear(2023, { sortBy: OpportunitiesSortBy.CREATED_DATE_DESC });
    expect(desc).toBeDefined();

    const closeAsc = await service.getArchivedListFromYear(2023, { sortBy: OpportunitiesSortBy.CLOSING_DATE_ASC });
    expect(closeAsc).toBeDefined();

    const closeDesc = await service.getArchivedListFromYear(2023, { sortBy: OpportunitiesSortBy.CLOSING_DATE_DESC });
    expect(closeDesc).toBeDefined();
  });

  it('should handle CRUD and action operations', async () => {
    const opp = new Opportunity({ opportunityId: 'opp-1', name: 'Opportunity 1' });

    (mockApi.getResource as any).mockResolvedValueOnce(mockOpportunities[0]);
    const fetched = await service.getById('opp-1');
    expect(fetched.opportunityId).toBe('opp-1');

    const inserted = await service.insert(opp);
    expect(inserted.opportunityId).toBe('opp-1');

    const updated = await service.update(opp);
    expect(updated.opportunityId).toBe('opp-1');

    await service.open(opp);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['opportunities', 'opp-1'], { body: { action: 'OPEN' } });

    await service.close(opp);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['opportunities', 'opp-1'], { body: { action: 'CLOSE' } });

    await service.archive(opp);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['opportunities', 'opp-1'], { body: { action: 'ARCHIVE' } });

    await service.unarchive(opp);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['opportunities', 'opp-1'], { body: { action: 'UNARCHIVE' } });

    await service.delete(opp);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['opportunities', 'opp-1']);
  });
});
