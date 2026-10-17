import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BallotsStandaloneComponent } from '@tabs/voting/ballots/ballots.component';
import { VotingBallot, VotingMajorityTypes, VotingSession } from '@models/votingSession.model';

describe('BallotsStandaloneComponent', () => {
  let component: BallotsStandaloneComponent;
  let mockPopoverCtrl: any;
  let mockTranslations: any;
  let mockApp: any;

  beforeEach(() => {
    mockPopoverCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockTranslations = {
      _: vi.fn().mockImplementation((k: string) => k)
    };
    mockApp = {};

    component = new BallotsStandaloneComponent(mockPopoverCtrl, mockTranslations, mockApp);
    component.votingSession = new VotingSession({
      ballots: [
        new VotingBallot({
          text: 'Approve Budget',
          majorityType: VotingMajorityTypes.SIMPLE,
          options: ['Yes', 'No']
        })
      ]
    });
  });

  it('should get options of ballot with and without results', () => {
    const optsNoResults = component.getOptionsOfBallotIncludingAbstainAndAbsentByIndex(0);
    expect(optsNoResults).toEqual(['Yes', 'No', 'VOTING.ABSTAIN']);

    component.results = {
      0: {
        0: { value: 60, voters: ['Alice'] },
        1: { value: 40, voters: ['Bob'] },
        2: { value: 10, voters: [] },
        3: { value: 5, voters: [] }
      }
    } as any;
    component.raw = false;
    const optsWithResults = component.getOptionsOfBallotIncludingAbstainAndAbsentByIndex(0);
    expect(optsWithResults).toEqual(['Yes', 'No']);

    component.raw = true;
    const optsWithRaw = component.getOptionsOfBallotIncludingAbstainAndAbsentByIndex(0);
    expect(optsWithRaw).toEqual(['Yes', 'No', 'VOTING.ABSTAIN', 'VOTING.ABSENT']);
  });

  it('should compute winning ballot option index for simple majority', () => {
    component.results = {
      0: {
        0: { value: 60, voters: [] },
        1: { value: 40, voters: [] },
        2: { value: 10, voters: [] },
        3: { value: 5, voters: [] }
      }
    } as any;
    component.raw = false;

    const winner = component.getWinningBallotOptionIndex(0);
    expect(winner).toBe(0); // 60 / (60 + 40) = 0.6 > 0.5
  });

  it('should compute winning ballot option index for various majority types and ties', () => {
    // Relative majority
    component.votingSession.ballots[0].majorityType = VotingMajorityTypes.RELATIVE;
    component.results = {
      0: {
        0: { value: 40, voters: [] },
        1: { value: 30, voters: [] },
        2: { value: 10, voters: [] },
        3: { value: 5, voters: [] }
      }
    } as any;
    component.raw = false;
    expect(component.getWinningBallotOptionIndex(0)).toBe(0);

    // Two-thirds majority: 70/100 > 2/3 -> wins
    component.votingSession.ballots[0].majorityType = VotingMajorityTypes.TWO_THIRDS;
    component.results = {
      0: {
        0: { value: 70, voters: [] },
        1: { value: 30, voters: [] },
        2: { value: 10, voters: [] },
        3: { value: 5, voters: [] }
      }
    } as any;
    expect(component.getWinningBallotOptionIndex(0)).toBe(0);

    // Two-thirds majority: 60/100 <= 2/3 -> no winner
    component.results = {
      0: {
        0: { value: 60, voters: [] },
        1: { value: 40, voters: [] },
        2: { value: 10, voters: [] },
        3: { value: 5, voters: [] }
      }
    } as any;
    expect(component.getWinningBallotOptionIndex(0)).toBe(-1);

    // Tie between options
    component.votingSession.ballots[0].majorityType = VotingMajorityTypes.SIMPLE;
    component.results = {
      0: {
        0: { value: 50, voters: [] },
        1: { value: 50, voters: [] },
        2: { value: 0, voters: [] },
        3: { value: 0, voters: [] }
      }
    } as any;
    expect(component.getWinningBallotOptionIndex(0)).toBe(-1);

    // Unsupported majority type
    component.votingSession.ballots[0].majorityType = 'UNKNOWN' as any;
    component.results = {
      0: {
        0: { value: 60, voters: [] },
        1: { value: 40, voters: [] },
        2: { value: 0, voters: [] },
        3: { value: 0, voters: [] }
      }
    } as any;
    expect(component.getWinningBallotOptionIndex(0)).toBe(-1);
  });

  it('should open majority type popover', async () => {
    const mockEvent = {} as any;
    await component.openMajorityTypePopover('SIMPLE', mockEvent);
    expect(mockPopoverCtrl.create).toHaveBeenCalled();
  });

  it('should open ballot votes detail popover and respect secret voting', async () => {
    // Without results
    component.results = undefined;
    await component.openBallotVotesDetailPopover(0, 0, 'Yes', {} as any);
    expect(mockPopoverCtrl.create).not.toHaveBeenCalled();

    // In secret session
    component.votingSession.isSecret = () => true;
    component.results = {
      0: {
        0: { value: 60, voters: ['Alice'] },
        1: { value: 40, voters: ['Bob'] },
        2: { value: 10, voters: [] },
        3: { value: 5, voters: [] }
      }
    } as any;
    await component.openBallotVotesDetailPopover(0, 0, 'Yes', {} as any);
    expect(mockPopoverCtrl.create).not.toHaveBeenCalled();

    // Not secret
    component.votingSession.isSecret = () => false;
    await component.openBallotVotesDetailPopover(0, 0, 'Yes', {} as any);
    expect(mockPopoverCtrl.create).toHaveBeenCalled();
  });

  it('should handle ballot reorder', () => {
    const mockDetail = { complete: vi.fn().mockImplementation((arr: any[]) => arr) };
    component.handleBallotReorder({ detail: mockDetail } as any);
    expect(mockDetail.complete).toHaveBeenCalled();
  });

  it('should handle ngOnChanges, buildCharts, and ngOnDestroy', () => {
    const mockChart = { destroy: vi.fn() };
    component.charts = [mockChart as any];

    vi.useFakeTimers();
    component.ngOnChanges({ results: {} as any });
    expect(mockChart.destroy).toHaveBeenCalled();
    expect(component.chartCanvasBaseId).toBeDefined();
    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    component.charts = [mockChart as any];
    component.ngOnDestroy();
    expect(mockChart.destroy).toHaveBeenCalledTimes(2);

    // buildCharts when results is undefined
    component.results = undefined;
    component.buildCharts();

    // buildCharts with results and canvas element
    const canvas = document.createElement('canvas');
    canvas.id = component.chartCanvasBaseId + '0';
    document.body.appendChild(canvas);

    component.results = {
      0: [
        { value: 60, voters: [] },
        { value: 40, voters: [] },
        { value: 10, voters: [] },
        { value: 5, voters: [] }
      ]
    } as any;
    component.buildCharts();
    expect(component.charts[0]).toBeDefined();

    const chartConfig = (component.charts[0] as any)?.config;
    const labelCb = chartConfig?.options?.plugins?.tooltip?.callbacks?.label;
    if (labelCb) {
      expect(labelCb({ parsed: 0.6543 })).toBe('65.43%');
    }

    canvas.remove();
  });
});
