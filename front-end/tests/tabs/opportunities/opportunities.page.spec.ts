import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpportunitiesPage } from '@tabs/opportunities/opportunities.page';
import { OpportunitiesService, OpportunitiesSortBy } from '@tabs/opportunities/opportunities.service';
import { AppService } from '@app/app.service';
import { IDEATranslationsService } from '@idea-ionic/common';
import { Opportunity } from '@models/opportunity.model';

describe('OpportunitiesPage', () => {
  let page: OpportunitiesPage;
  let mockOpportunitiesService: Partial<OpportunitiesService>;
  let mockApp: Partial<AppService>;
  let mockTranslations: Partial<IDEATranslationsService>;

  const mockOpportunities: Partial<Opportunity>[] = [
    { opportunityId: 'opp-1', name: 'Main Chair' } as Opportunity
  ];

  beforeEach(() => {
    mockOpportunitiesService = {
      getActiveList: vi.fn().mockResolvedValue(mockOpportunities)
    };
    mockApp = {
      goToInTabs: vi.fn()
    };
    mockTranslations = {};

    page = new OpportunitiesPage(
      mockTranslations as IDEATranslationsService,
      mockOpportunitiesService as OpportunitiesService,
      mockApp as AppService
    );
  });

  it('should initialize filterByStatus to null', () => {
    expect(page.filterByStatus).toBeNull();
  });

  it('should load opportunities on ngOnInit', async () => {
    await page.ngOnInit();

    expect(mockOpportunitiesService.getActiveList).toHaveBeenCalledWith({ force: true, withPagination: true });
    expect(page.opportunities).toEqual(mockOpportunities);
  });

  it('should filter opportunities with status parameter', async () => {
    page.filterByStatus = true;
    await page.filter('chair');

    expect(mockOpportunitiesService.getActiveList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'chair',
        status: true,
        withPagination: true,
        sortBy: OpportunitiesSortBy.CREATED_DATE_DESC
      })
    );
  });

  it('should call filter on ionViewDidEnter', () => {
    const filterSpy = vi.spyOn(page, 'filter').mockResolvedValue(undefined as any);
    page.ionViewDidEnter();
    expect(filterSpy).toHaveBeenCalledWith('', undefined, true);
  });

  it('should reload opportunities on handleRefresh', async () => {
    const mockRefresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(mockRefresher);
    expect(page.opportunities).toEqual(mockOpportunities);
    expect(mockRefresher.complete).toHaveBeenCalled();
  });

  it('should paginate with scrollToNextPage in filter', async () => {
    vi.useFakeTimers();
    page.opportunities = [{ opportunityId: 'opp-last' } as any];
    const mockInfiniteScroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;

    await page.filter('search', mockInfiniteScroll);
    expect(mockOpportunitiesService.getActiveList).toHaveBeenCalledWith(
      expect.objectContaining({ startPaginationAfterId: 'opp-last' })
    );

    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should navigate to opportunity details and creation', () => {
    const opp = { opportunityId: 'opp-1' } as Opportunity;
    page.openOpportunity(opp);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities', 'opp-1']);

    page.addOpportunity();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities', 'new', 'manage']);
  });
});
