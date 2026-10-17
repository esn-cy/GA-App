import { describe, expect, it } from 'vitest';
import { MajorityTypeStandaloneComponent } from '@tabs/voting/ballots/majorityType.component';

describe('MajorityTypeStandaloneComponent', () => {
  it('should accept majorityType input', () => {
    const component = new MajorityTypeStandaloneComponent();
    component.majorityType = 'SIMPLE';
    expect(component.majorityType).toBe('SIMPLE');
  });
});
