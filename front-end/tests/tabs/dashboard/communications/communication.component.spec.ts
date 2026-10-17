import { describe, expect, it } from 'vitest';
import { CommunicationComponent } from '@tabs/dashboard/communications/communication.component';

describe('CommunicationComponent', () => {
  it('should initialize with defaults and emit select event', () => {
    const component = new CommunicationComponent();
    expect(component.color).toBe('white');
    expect(component.button).toBe(false);

    let selected = false;
    component.select.subscribe(() => (selected = true));
    component.select.emit();
    expect(selected).toBe(true);
  });
});
