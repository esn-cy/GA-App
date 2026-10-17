import { describe, expect, it, vi } from 'vitest';
import { UsefulLinkComponent } from '@tabs/dashboard/usefulLinks/usefulLink.component';
import { UsefulLink } from '@models/usefulLink.model';

describe('UsefulLinkComponent', () => {
  it('should initialize with defaults and emit select event', () => {
    const component = new UsefulLinkComponent();
    expect(component.link).toBeUndefined();
    expect(component.color).toBe('white');
    expect(component.button).toBe(false);

    const spy = vi.fn();
    component.select.subscribe(spy);
    component.link = new UsefulLink({ linkId: 'l-1', name: 'Handbook', url: 'https://example.com' });

    component.select.emit();
    expect(spy).toHaveBeenCalled();
  });
});
