import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageDeadlineComponent } from '@tabs/dashboard/deadlines/manageDeadline.component';
import { Deadline } from '@models/deadline.model';

describe('ManageDeadlineComponent', () => {
  let component: ManageDeadlineComponent;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockTranslations: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockDeadlinesService: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockDeadlinesService = {
      insert: vi.fn().mockResolvedValue(new Deadline({ deadlineId: 'd-new', name: 'New Deadline' })),
      update: vi.fn().mockResolvedValue(new Deadline({ deadlineId: 'd-1', name: 'Updated Deadline' })),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      configurations: { timezone: 'Europe/Brussels' }
    };

    component = new ManageDeadlineComponent(
      mockModalCtrl,
      mockAlertCtrl,
      mockTranslations,
      mockLoading,
      mockMessage,
      mockDeadlinesService,
      mockApp
    );
  });

  it('should validate and insert deadline', async () => {
    component.deadline = new Deadline({
      name: 'Future Deadline',
      at: '2099-01-01T12:00:00.000Z'
    });

    await component.save();
    expect(mockDeadlinesService.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should validate and update existing deadline', async () => {
    component.deadline = new Deadline({
      deadlineId: 'd-1',
      name: 'Future Deadline',
      at: '2099-01-01T12:00:00.000Z'
    });

    await component.save();
    expect(mockDeadlinesService.update).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should reject invalid deadline on save', async () => {
    component.deadline = new Deadline({
      name: '',
      at: ''
    });

    await component.save();
    expect(component.hasFieldAnError('name')).toBe(true);
    expect(component.hasFieldAnError('at')).toBe(true);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
    expect(mockDeadlinesService.insert).not.toHaveBeenCalled();
  });

  it('should handle save error', async () => {
    component.deadline = new Deadline({
      name: 'Future Deadline',
      at: '2099-01-01T12:00:00.000Z'
    });
    mockDeadlinesService.insert.mockRejectedValueOnce(new Error('fail'));

    await component.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should prompt alert on askAndDelete, execute handler, and handle error', async () => {
    component.deadline = new Deadline({ deadlineId: 'd-1', name: 'To Delete' });

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndDelete();
    await doDelete();
    expect(mockDeadlinesService.delete).toHaveBeenCalledWith(component.deadline);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Delete failure
    mockDeadlinesService.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndDelete();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should dismiss on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
