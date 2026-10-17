import { describe, expect, it, vi } from 'vitest';
import { VotingSessionStandaloneComponent } from '@tabs/voting/votingSession.component';
import { VotingSession, VotingSessionTypes } from '@models/votingSession.model';

describe('VotingSessionStandaloneComponent', () => {
  it('should initialize and get color by type', () => {
    const mockApp = {} as any;
    const component = new VotingSessionStandaloneComponent(mockApp);

    expect(component.getColorByType()).toBe('ESNdarkBlue');

    component.votingSession = new VotingSession({ type: VotingSessionTypes.FORM_SECRET });
    expect(component.getColorByType()).toBe('ESNpink');

    component.votingSession.type = VotingSessionTypes.IMMEDIATE;
    expect(component.getColorByType()).toBe('ESNcyan');

    component.votingSession.type = VotingSessionTypes.ROLL_CALL;
    expect(component.getColorByType()).toBe('secondary');

    component.votingSession.type = VotingSessionTypes.FORM_PUBLIC;
    expect(component.getColorByType()).toBe('ESNdarkBlue');

    const spy = vi.fn();
    component.select.subscribe(spy);
    component.select.emit();
    expect(spy).toHaveBeenCalled();
  });
});
