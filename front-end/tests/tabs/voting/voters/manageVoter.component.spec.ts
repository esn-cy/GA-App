import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageVoterStandaloneComponent } from '@tabs/voting/voters/manageVoter.component';
import { Voter, VotingSession, VotingSessionTypes } from '@models/votingSession.model';

describe('ManageVoterStandaloneComponent', () => {
  let component: ManageVoterStandaloneComponent;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockVoting: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockVoting = {
      resendVotingTicketToVoter: vi.fn().mockResolvedValue(undefined),
      getVotingTokenOfVoter: vi.fn().mockResolvedValue('token-123')
    };
    mockApp = {};

    component = new ManageVoterStandaloneComponent(
      mockModalCtrl,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockVoting,
      mockApp
    );
    component.votingSession = new VotingSession({ type: VotingSessionTypes.FORM_PUBLIC });
    component.voter = new Voter({ id: 'v-1', name: 'Alice' }, component.votingSession);
  });

  it('should initialize and clone voter on ngOnInit', () => {
    component.ngOnInit();
    expect(component.voter.name).toBe('Alice');
  });

  it('should validate and save valid voter', async () => {
    component.ngOnInit();
    component.voter.name = 'Valid Name';
    await component.save();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(component.voter);
  });

  it('should reject invalid voter on save', async () => {
    component.ngOnInit();
    component.voter.name = '';
    await component.save();

    expect(component.hasFieldAnError('name')).toBe(true);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
  });

  it('should mark voter with DELETE id on removeVoter', () => {
    component.ngOnInit();
    component.removeVoter();
    expect(component.voter.id).toBe('DELETE');
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(component.voter);
  });

  it('should open prompt on resendVotingLink, execute handler, and handle error', async () => {
    component.ngOnInit();

    let doSend: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.resendVotingLink();

    // Empty email
    await doSend({ email: '' });
    expect(mockVoting.resendVotingTicketToVoter).not.toHaveBeenCalled();

    // Valid email
    await doSend({ email: 'new@example.com' });
    expect(mockVoting.resendVotingTicketToVoter).toHaveBeenCalledWith(
      component.votingSession,
      component.voter,
      'new@example.com'
    );
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');

    // Resend error
    mockVoting.resendVotingTicketToVoter.mockRejectedValueOnce(new Error('fail'));
    await doSend({ email: 'err@example.com' });
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should fetch token and show alert on showVotingSecret, and handle error', async () => {
    component.ngOnInit();
    await component.showVotingSecret();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockVoting.getVotingTokenOfVoter).toHaveBeenCalledWith(component.votingSession, component.voter);
    expect(mockAlertCtrl.create).toHaveBeenCalled();
    expect(mockLoading.hide).toHaveBeenCalled();

    // Secret fetch error
    mockVoting.getVotingTokenOfVoter.mockRejectedValueOnce(new Error('fail'));
    await component.showVotingSecret();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should dismiss on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
