import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeadlinesComponent } from '@tabs/dashboard/deadlines/deadlines.component';
import { Deadline } from '@models/deadline.model';

describe('DeadlinesComponent', () => {
  let component: DeadlinesComponent;
  let mockModalCtrl: any;
  let mockMessage: any;
  let mockDeadlinesService: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue({
        present: vi.fn(),
        onDidDismiss: vi.fn().mockResolvedValue({ data: true })
      })
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockDeadlinesService = {
      getList: vi.fn().mockResolvedValue([
        new Deadline({ deadlineId: 'd-1', name: 'Submit Candidacy', at: '2026-10-25T10:00:00.000Z' })
      ])
    };
    mockApp = {
      configurations: { timezone: 'UTC' },
      getYearsSince: vi.fn().mockReturnValue([2023, 2024, 2025, 2026])
    };

    component = new DeadlinesComponent(
      mockModalCtrl,
      mockMessage,
      mockDeadlinesService,
      mockApp
    );
  });

  it('should initialize years on ngOnInit and load list on loadListOfYear', async () => {
    component.ngOnInit();
    expect(mockApp.getYearsSince).toHaveBeenCalledWith(2023);
    expect(component.years).toEqual([2023, 2024, 2025, 2026]);

    await component.loadListOfYear(2026);
    expect(mockDeadlinesService.getList).toHaveBeenCalledWith({ force: true, year: 2026 });
    expect(component.deadlines?.length).toBe(1);

    mockDeadlinesService.getList.mockRejectedValueOnce(new Error('fail'));
    await component.loadListOfYear(2025);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.COULDNT_LOAD_LIST');
  });

  it('should open manage deadline modal on addDeadline', async () => {
    await component.addDeadline();
    expect(mockModalCtrl.create).toHaveBeenCalled();
  });

  it('should open edit deadline modal on editDeadline', async () => {
    const d = new Deadline({ deadlineId: 'd-1' });
    await component.editDeadline(d);
    expect(mockModalCtrl.create).toHaveBeenCalled();
  });

  it('should close modal on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
