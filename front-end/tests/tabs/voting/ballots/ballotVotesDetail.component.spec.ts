import { describe, expect, it } from 'vitest';
import { BallotVotesDetailStandaloneComponent } from '@tabs/voting/ballots/ballotVotesDetail.component';

describe('BallotVotesDetailStandaloneComponent', () => {
  it('should sort voters alphabetically on ngOnInit', () => {
    const component = new BallotVotesDetailStandaloneComponent();
    component.ballotOption = 'In Favor';
    component.votersNames = ['Charlie', 'Alice', 'Bob'];

    component.ngOnInit();
    expect(component.votersNames).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
