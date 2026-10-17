import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VotingSessionsPage } from '@tabs/voting/votingSessions.page';
import { VotingService, VotingSessionsSortBy } from '@tabs/voting/voting.service';
import { GAEventsService } from '@tabs/configurations/events/events.service';
import { AppService } from '@app/app.service';
import { IDEAActionSheetController, IDEATranslationsService } from '@idea-ionic/common';
import { VotingSession } from '@models/votingSession.model';

describe('VotingSessionsPage', () => {
  let page: VotingSessionsPage;
  let mockVotingService: Partial<VotingService>;
  let mockEventsService: Partial<GAEventsService>;
  let mockApp: Partial<AppService>;
  let mockActionsCtrl: Partial<IDEAActionSheetController>;
  let mockTranslations: Partial<IDEATranslationsService>;

  const mockSessions: Partial<VotingSession>[] = [
    { sessionId: 'sess-1', name: 'Vote on Budget' } as VotingSession
  ];

  beforeEach(() => {
    mockVotingService = {
      getActiveList: vi.fn().mockResolvedValue(mockSessions)
    };
    mockEventsService = {
      getList: vi.fn().mockResolvedValue([{ eventId: 'event-1', name: 'October GA' } as any])
    };
    mockApp = {
      goToInTabs: vi.fn()
    };
    mockActionsCtrl = {};
    mockTranslations = {
      _: vi.fn().mockReturnValue('Choose type')
    };

    page = new VotingSessionsPage(
      mockActionsCtrl as IDEAActionSheetController,
      mockTranslations as IDEATranslationsService,
      mockVotingService as VotingService,
      mockEventsService as GAEventsService,
      mockApp as AppService
    );
  });

  it('should initialize filterByEvent to null', () => {
    expect(page.filterByEvent).toBeNull();
  });

  it('should load voting sessions and events on ngOnInit', async () => {
    await page.ngOnInit();

    expect(mockVotingService.getActiveList).toHaveBeenCalledWith({ force: true, withPagination: true });
    expect(mockEventsService.getList).toHaveBeenCalled();
    expect(page.votingSessions).toEqual(mockSessions);
  });

  it('should pass event filter to voting service when filtering', async () => {
    page.filterByEvent = 'event-1';
    await page.filter('test search');

    expect(mockVotingService.getActiveList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'test search',
        eventId: 'event-1',
        withPagination: true,
        sortBy: VotingSessionsSortBy.CREATED_DATE_DESC
      })
    );
  });

  it('should trigger filter on ionViewDidEnter', () => {
    const filterSpy = vi.spyOn(page, 'filter');
    page.ionViewDidEnter();
    expect(filterSpy).toHaveBeenCalledWith('', undefined, true);
  });

  it('should refresh resources on handleRefresh', async () => {
    const mockRefresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(mockRefresher);
    expect(mockVotingService.getActiveList).toHaveBeenCalled();
    expect(mockRefresher.complete).toHaveBeenCalled();
  });

  it('should handle infinite scroll pagination in filter', async () => {
    vi.useFakeTimers();
    page.votingSessions = [new VotingSession({ sessionId: 's-last' })];
    const mockInfiniteScroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;

    await page.filter('query', mockInfiniteScroll);
    expect(mockVotingService.getActiveList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'query',
        startPaginationAfterId: 's-last'
      })
    );
    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should present action sheet and navigate in addVotingSession', async () => {
    let actionButtons: any[] = [];
    mockActionsCtrl.create = vi.fn().mockImplementation(async (opts: any) => {
      actionButtons = opts.buttons;
      return { present: vi.fn().mockResolvedValue(undefined) };
    });

    await page.addVotingSession();
    expect(mockActionsCtrl.create).toHaveBeenCalled();
    expect(actionButtons.length).toBe(5);

    // Test each handler
    actionButtons[0].handler();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 'FORM_PUBLIC', 'manage']);

    actionButtons[1].handler();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 'FORM_SECRET', 'manage']);

    actionButtons[2].handler();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 'IMMEDIATE', 'manage']);

    actionButtons[3].handler();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 'ROLL_CALL', 'manage']);
  });

  it('should navigate to voting session on goToVotingSession', () => {
    const session = new VotingSession({ sessionId: 's-123' });
    page.goToVotingSession(session);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 's-123']);
  });
});
