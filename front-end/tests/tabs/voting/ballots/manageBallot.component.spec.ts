import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageBallotStandaloneComponent } from '@tabs/voting/ballots/manageBallot.component';
import { VotingBallot, VotingMajorityTypes } from '@models/votingSession.model';

describe('ManageBallotStandaloneComponent', () => {
  let component: ManageBallotStandaloneComponent;
  let mockModalCtrl: any;
  let mockMessage: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {};

    component = new ManageBallotStandaloneComponent(mockModalCtrl, mockMessage, mockApp);
    component.ballot = new VotingBallot({
      text: 'Original Ballot',
      majorityType: VotingMajorityTypes.SIMPLE,
      options: ['Option 1']
    });
  });

  it('should clone ballot on ngOnInit', () => {
    component.ngOnInit();
    expect(component.ballot.text).toBe('Original Ballot');
  });

  it('should add and remove options', () => {
    component.ngOnInit();
    component.addOption();
    expect(component.ballot.options.length).toBe(2);

    component.removeOptionByIndex(1);
    expect(component.ballot.options.length).toBe(1);
  });

  it('should validate and save ballot', async () => {
    component.ngOnInit();
    component.ballot.options = ['Yes', 'No'];

    await component.save();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(component.ballot);
  });

  it('should reject invalid ballot on save', async () => {
    component.ngOnInit();
    component.ballot.text = '';

    await component.save();
    expect(component.hasFieldAnError('text')).toBe(true);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
  });

  it('should dismiss on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should handle options reorder and trackByIndex', () => {
    const mockDetail = { complete: vi.fn().mockImplementation((arr: any[]) => arr) };
    component.handleOptionsReorder({ detail: mockDetail } as any);
    expect(mockDetail.complete).toHaveBeenCalled();

    expect(component.trackByIndex(3)).toBe(3);
  });
});
