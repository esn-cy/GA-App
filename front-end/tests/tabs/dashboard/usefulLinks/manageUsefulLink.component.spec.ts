import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageUsefulLinkComponent } from '@tabs/dashboard/usefulLinks/manageUsefulLink.component';
import { UsefulLink } from '@models/usefulLink.model';

describe('ManageUsefulLinkComponent', () => {
  let component: ManageUsefulLinkComponent;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockTranslations: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockUsefulLinksService: any;

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
    mockUsefulLinksService = {
      insert: vi.fn().mockResolvedValue(new UsefulLink({ linkId: 'l-new', name: 'New Link' })),
      update: vi.fn().mockResolvedValue(new UsefulLink({ linkId: 'l-1', name: 'Updated Link' })),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    component = new ManageUsefulLinkComponent(
      mockModalCtrl,
      mockAlertCtrl,
      mockTranslations,
      mockLoading,
      mockMessage,
      mockUsefulLinksService
    );
  });

  it('should validate and insert link', async () => {
    component.link = new UsefulLink({
      name: 'Guide',
      url: 'https://example.com'
    });

    await component.save();
    expect(mockUsefulLinksService.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should validate and update existing link', async () => {
    component.link = new UsefulLink({
      linkId: 'l-1',
      name: 'Guide',
      url: 'https://example.com'
    });

    await component.save();
    expect(mockUsefulLinksService.update).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should reject invalid link on save', async () => {
    component.link = new UsefulLink({
      name: '',
      url: 'not-a-valid-url'
    });

    await component.save();
    expect(component.hasFieldAnError('name')).toBe(true);
    expect(component.hasFieldAnError('url')).toBe(true);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
    expect(mockUsefulLinksService.insert).not.toHaveBeenCalled();
  });

  it('should handle save error', async () => {
    component.link = new UsefulLink({
      name: 'Guide',
      url: 'https://example.com'
    });
    mockUsefulLinksService.insert.mockRejectedValueOnce(new Error('fail'));

    await component.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should prompt confirmation on askAndDelete, execute handler, and handle error', async () => {
    component.link = new UsefulLink({ linkId: 'l-1', name: 'To Delete' });

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndDelete();
    await doDelete();
    expect(mockUsefulLinksService.delete).toHaveBeenCalledWith(component.link);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Delete failure
    mockUsefulLinksService.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndDelete();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should close on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
