import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VotingSessionPage } from '@tabs/voting/votingSession.page';
import { VotingSession, VotingSessionTypes } from '@models/votingSession.model';

describe('VotingSessionPage', () => {
  let page: VotingSessionPage;
  let mockLoading: any;
  let mockMessage: any;
  let mockVoting: any;
  let mockTranslations: any;
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
      getById: vi.fn().mockResolvedValue(new VotingSession({
        sessionId: 's-1',
        name: 'President Election',
        type: VotingSessionTypes.FORM_SECRET,
        startsAt: new Date(Date.now() - 200000).toISOString(),
        endsAt: new Date(Date.now() - 100000).toISOString(),
        results: { 0: {} } as any,
        resultsPublished: true,
        voters: [{ id: 'v-1', name: 'Alice' }],
        participantVoters: ['Bob']
      })),
      downloadResultsSpreadsheet: vi.fn()
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Results')
    };
    mockApp = {
      goToInTabs: vi.fn()
    };

    page = new VotingSessionPage(
      mockLoading,
      mockMessage,
      mockVoting,
      mockTranslations,
      mockApp
    );
    page.sessionId = 's-1';
  });

  it('should load voting session on ionViewWillEnter and handle unpublished results', async () => {
    await page.ionViewWillEnter();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockVoting.getById).toHaveBeenCalledWith('s-1');
    expect(page.votingSession?.name).toBe('President Election');
    expect(page.absentVoters).toBeDefined();
    expect(mockLoading.hide).toHaveBeenCalled();

    // When resultsPublished is false
    mockVoting.getById.mockResolvedValueOnce(new VotingSession({
      sessionId: 's-2',
      name: 'Unpublished Session',
      resultsPublished: false,
      results: { 0: {} } as any,
      participantVoters: ['Alice']
    }));
    await page.ionViewWillEnter();
    expect(page.votingSession?.results).toBeUndefined();
    expect(page.votingSession?.participantVoters).toBeUndefined();
  });

  it('should handle refresher on handleRefresh', async () => {
    const refresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(refresher);

    expect(page.votingSession).toBeDefined();
    expect(refresher.complete).toHaveBeenCalled();
  });

  it('should navigate to manage session page', async () => {
    await page.ionViewWillEnter();
    page.manageSession();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['voting', 's-1', 'manage']);

    page.votingSession = undefined;
    page.manageSession();
  });

  it('should check if voter was absent', async () => {
    await page.ionViewWillEnter();
    const absentVoter = page.votingSession!.voters[0];
    expect(page.wasVoterAbsent(absentVoter)).toBe(true);
    expect(page.wasVoterAbsent({ id: 'v-999' } as any)).toBe(false);
  });

  it('should download results spreadsheet', async () => {
    await page.ionViewWillEnter();
    page.votingSession!.results = { 0: {} } as any;
    page.downloadResults();

    expect(mockVoting.downloadResultsSpreadsheet).toHaveBeenCalled();

    page.votingSession = undefined;
    page.downloadResults();
  });

  it('should return color by type', async () => {
    page.votingSession = undefined;
    expect(page.getColorByType()).toBe('ESNdarkBlue');

    await page.ionViewWillEnter();
    expect(page.getColorByType()).toBe('ESNpink');

    page.votingSession!.type = VotingSessionTypes.IMMEDIATE;
    expect(page.getColorByType()).toBe('ESNcyan');

    page.votingSession!.type = VotingSessionTypes.ROLL_CALL;
    expect(page.getColorByType()).toBe('secondary');

    page.votingSession!.type = VotingSessionTypes.FORM_PUBLIC;
    expect(page.getColorByType()).toBe('ESNdarkBlue');
  });

  it('should handle error in ionViewWillEnter', async () => {
    mockVoting.getById.mockRejectedValueOnce(new Error('fail'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalled();
    expect(mockLoading.hide).toHaveBeenCalled();
  });
});
