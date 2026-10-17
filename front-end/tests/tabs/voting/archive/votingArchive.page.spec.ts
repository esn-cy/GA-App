import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VotingArchivePage } from '@tabs/voting/archive/votingArchive.page';
import { VotingSession, VotingSessionTypes } from '@models/votingSession.model';
import { GAEvent } from '@models/event.model';

describe('VotingArchivePage', () => {
  let page: VotingArchivePage;
  let mockLoading: any;
  let mockMessage: any;
  let mockVoting: any;
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
    mockVoting = {
      getArchivedList: vi.fn().mockResolvedValue([
        new VotingSession({ sessionId: 's-1', name: 'Archived Vote', type: VotingSessionTypes.FORM_SECRET })
      ])
    };
    mockEvents = {
      getList: vi.fn().mockResolvedValue([new GAEvent({ eventId: 'ev-1', name: 'Spring GA' })])
    };
    mockApp = {
      goToInTabs: vi.fn()
    };

    page = new VotingArchivePage(
      mockLoading,
      mockMessage,
      mockVoting,
      mockEvents,
      mockApp
    );
  });

  it('should load events on ngOnInit', async () => {
    await page.ngOnInit();
    expect(mockEvents.getList).toHaveBeenCalledWith({ all: true });
    expect(page.events?.length).toBe(1);
  });

  it('should filter archived sessions on search and handle search error', async () => {
    await page.search();
    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockVoting.getArchivedList).toHaveBeenCalledWith(expect.objectContaining({
      force: true
    }));
    expect(page.votingSessions?.length).toBe(1);
    expect(mockLoading.hide).toHaveBeenCalled();

    // Search failure
    mockVoting.getArchivedList.mockRejectedValueOnce(new Error('fail'));
    await page.search();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
    expect(mockLoading.hide).toHaveBeenCalledTimes(2);
  });

  it('should paginate with scrollToNextPage in filter', async () => {
    vi.useFakeTimers();
    page.votingSessions = [new VotingSession({ sessionId: 's-last' })];
    const mockInfiniteScroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;

    await page.filter(false, mockInfiniteScroll);
    expect(mockVoting.getArchivedList).toHaveBeenCalledWith(
      expect.objectContaining({ startPaginationAfterId: 's-last' })
    );

    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should navigate to voting session on goToVotingSession', () => {
    const session = new VotingSession({ sessionId: 's-1' });
    page.goToVotingSession(session);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 's-1']);
  });
});
