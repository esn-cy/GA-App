import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VotePage } from '@tabs/voting/vote/vote.page';
import { VotingSession } from '@models/votingSession.model';
import { VotingTicket } from '@models/votingTicket.model';

describe('VotePage', () => {
  let page: VotePage;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockTranslations: any;
  let mockVoting: any;
  let mockApp: any;

  beforeEach(() => {
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockVoting = {
      beginVote: vi.fn().mockResolvedValue({
        votingSession: new VotingSession({
          sessionId: 's-1',
          ballots: [{ text: 'B1', options: ['Yes', 'No'] }]
        }),
        votingTicket: new VotingTicket({ ticketId: 'tick-1' })
      }),
      submitVotes: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {};

    page = new VotePage(
      mockAlertCtrl,
      mockLoading,
      mockTranslations,
      mockVoting,
      mockApp
    );
    page.sessionId = 's-1';
    page.voterId = 'v-1';
    page.ticket = 'tick-1';
  });

  it('should initialize vote and retrieve ticket and session on ngOnInit', async () => {
    await page.ngOnInit();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockVoting.beginVote).toHaveBeenCalledWith('s-1', 'v-1', 'tick-1');
    expect(page.votingSession).toBeDefined();
    expect(page.votingTicket).toBeDefined();
    expect(mockLoading.hide).toHaveBeenCalled();
  });

  it('should handle invalid voting link error on ngOnInit', async () => {
    mockVoting.beginVote = vi.fn().mockRejectedValue(new Error('Invalid token'));
    await page.ngOnInit();

    expect(page.errorString).toBe('Translated');
  });

  it('should check field error status', () => {
    page.errors = new Set(['ballots[0]']);
    expect(page.hasFieldAnError('ballots[0]')).toBe(true);
    expect(page.hasFieldAnError('ballots[1]')).toBe(false);
  });

  it('should prompt confirmation on submitVote and handle submission execution and errors', async () => {
    await page.ngOnInit();

    // Incomplete submission validation error
    page.submission = []; // missing vote for ballot 0
    await page.submitVote();
    expect(mockAlertCtrl.create).toHaveBeenCalled();

    // Valid submission
    page.submission = [0];
    let doSubmit: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSubmit = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.submitVote();
    await doSubmit();
    expect(mockVoting.submitVotes).toHaveBeenCalledWith(page.votingTicket, [0]);
    expect(page.voted).toBe(true);

    // Already voted error during submission
    mockVoting.submitVotes.mockRejectedValueOnce(new Error('Already voted'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSubmit = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.submitVote();
    await doSubmit();
    expect(mockAlertCtrl.create).toHaveBeenCalled();

    // Generic error during submission
    mockVoting.submitVotes.mockRejectedValueOnce(new Error('network error'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSubmit = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.submitVote();
    await doSubmit();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
  });
});
