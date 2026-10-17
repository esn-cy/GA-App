import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchivePage } from '@tabs/opportunities/archive/archive.page';
import { Opportunity } from '@models/opportunity.model';

describe('Opportunities ArchivePage', () => {
  let page: ArchivePage;
  let mockLoading: any;
  let mockMessage: any;
  let mockOpportunities: any;
  let mockApp: any;

  beforeEach(() => {
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockOpportunities = {
      getArchivedListFromYear: vi.fn().mockResolvedValue([
        new Opportunity({ opportunityId: 'opp-1', name: 'Archived Call' })
      ])
    };
    mockApp = {
      getYearsSince: vi.fn().mockReturnValue([2023, 2024, 2025, 2026]),
      goToInTabs: vi.fn()
    };

    page = new ArchivePage(
      mockLoading,
      mockMessage,
      mockOpportunities,
      mockApp
    );
  });

  it('should initialize years on ngOnInit', () => {
    page.ngOnInit();
    expect(mockApp.getYearsSince).toHaveBeenCalledWith(2023);
    expect(page.years).toEqual([2023, 2024, 2025, 2026]);
  });

  it('should filter archived opportunities on search and handle search error', async () => {
    await page.search();
    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockOpportunities.getArchivedListFromYear).toHaveBeenCalledWith(page.archivedFromYear, expect.objectContaining({
      force: true
    }));
    expect(page.opportunities?.length).toBe(1);
    expect(mockLoading.hide).toHaveBeenCalled();

    // Search failure
    mockOpportunities.getArchivedListFromYear.mockRejectedValueOnce(new Error('fail'));
    await page.search();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
    expect(mockLoading.hide).toHaveBeenCalledTimes(2);
  });

  it('should paginate with scrollToNextPage in filter', async () => {
    vi.useFakeTimers();
    page.opportunities = [new Opportunity({ opportunityId: 'opp-last' })];
    const mockInfiniteScroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;

    await page.filter(false, mockInfiniteScroll);
    expect(mockOpportunities.getArchivedListFromYear).toHaveBeenCalledWith(
      page.archivedFromYear,
      expect.objectContaining({ startPaginationAfterId: 'opp-last' })
    );

    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should navigate to opportunity on openOpportunity', () => {
    const opp = new Opportunity({ opportunityId: 'opp-1' });
    page.openOpportunity(opp);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities', 'opp-1']);
  });
});
