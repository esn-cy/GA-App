import { describe, expect, it, vi } from 'vitest';
import { OpportunityComponent } from '@tabs/opportunities/opportunity.component';
import { Opportunity } from '@models/opportunity.model';

describe('OpportunityComponent', () => {
  it('should initialize and emit select on selection', () => {
    const mockApp = {} as any;
    const component = new OpportunityComponent(mockApp);

    expect(component.row).toBe(false);
    expect(component.header).toBe(false);

    const spy = vi.fn();
    component.select.subscribe(spy);

    component.opportunity = new Opportunity({ opportunityId: 'opp-1', name: 'Open Call' });
    component.select.emit();
    expect(spy).toHaveBeenCalled();
  });
});
