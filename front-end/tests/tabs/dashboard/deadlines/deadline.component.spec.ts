import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeadlineComponent } from '@tabs/dashboard/deadlines/deadline.component';
import { Deadline } from '@models/deadline.model';
import { addDays } from 'date-fns';

describe('DeadlineComponent', () => {
  let component: DeadlineComponent;
  let mockTranslations: any;
  let mockApp: any;

  beforeEach(() => {
    mockTranslations = {
      _: vi.fn().mockImplementation((k: string) => k),
      getCurrentLang: vi.fn().mockReturnValue('en')
    };
    mockApp = {
      isInMobileMode: vi.fn().mockReturnValue(false),
      configurations: { timezone: 'UTC' }
    };
    component = new DeadlineComponent(mockTranslations, mockApp);
  });

  it('should return light color and empty label when deadline is undefined', () => {
    expect(component.getDeadlineColor()).toBe('light');
    expect(component.getDeadlineLabel()).toBe('');
  });

  it('should return danger color and TODAY label when deadline is today', () => {
    component.deadline = new Deadline({ at: new Date().toISOString() });
    expect(component.getDeadlineColor()).toBe('danger');
    expect(component.getDeadlineLabel()).toBe('DEADLINES.TODAY');
  });

  it('should return warning color and TOMORROW label when deadline is tomorrow', () => {
    component.deadline = new Deadline({ at: addDays(new Date(), 1).toISOString() });
    expect(component.getDeadlineColor()).toBe('warning');
    expect(component.getDeadlineLabel()).toBe('DEADLINES.TOMORROW');
  });

  it('should return light color for future dates past tomorrow', () => {
    component.deadline = new Deadline({ at: addDays(new Date(), 5).toISOString() });
    expect(component.getDeadlineColor()).toBe('light');
    expect(component.getDeadlineLabel()).toBeTruthy();
  });
});
