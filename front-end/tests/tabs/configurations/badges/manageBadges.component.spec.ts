import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageBadgesComponent } from '@tabs/configurations/badges/manageBadges.component';
import { Badge } from '@models/badge.model';

describe('ManageBadgesComponent', () => {
  let component: ManageBadgesComponent;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockMedia: any;
  let mockBadges: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockMedia = {
      uploadImage: vi.fn().mockResolvedValue('uri-123')
    };
    mockBadges = {
      insert: vi.fn().mockResolvedValue(new Badge({ badgeId: 'b-new', name: 'New' })),
      update: vi.fn().mockResolvedValue(new Badge({ badgeId: 'b-1', name: 'Updated' })),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      getImageURLByURI: vi.fn().mockReturnValue('https://cdn.example.com/uri-123')
    };

    component = new ManageBadgesComponent(
      mockModalCtrl,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockMedia,
      mockBadges,
      mockApp
    );
    component.badge = new Badge({
      name: 'Speaker',
      description: 'Gave a talk',
      imageURL: 'https://example.com/badge.png'
    });
    component.ngOnInit();
  });

  it('should validate form and reject save if required fields are missing', async () => {
    component.badge.name = '';
    await component.save();

    expect(component.hasFieldAnError('name')).toBe(true);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
    expect(mockBadges.insert).not.toHaveBeenCalled();
  });

  it('should insert new badge when badgeId is absent', async () => {
    component.badge = new Badge({ name: 'Valid Badge', description: 'Desc', imageURL: 'https://example.com/img.png' });
    await component.save();

    expect(mockBadges.insert).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(true);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
  });

  it('should update existing badge when badgeId is present', async () => {
    component.badge = new Badge({
      badgeId: 'b-1',
      name: 'Valid Badge',
      description: 'Desc',
      imageURL: 'https://example.com/img.png'
    });
    await component.save();

    expect(mockBadges.update).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(true);
  });

  it('should handle save error', async () => {
    component.badge = new Badge({ name: 'Valid Badge', description: 'Desc', imageURL: 'https://example.com/img.png' });
    mockBadges.insert.mockRejectedValueOnce(new Error('fail'));
    await component.save();

    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should handle uploadImage with no file and on error', async () => {
    // No file
    await component.uploadImage({ target: { files: null } as any });
    expect(mockMedia.uploadImage).not.toHaveBeenCalled();

    // Error on upload
    const file = new File(['content'], 'badge.png', { type: 'image/png' });
    const target = { files: [file], value: 'badge.png' } as any;
    mockMedia.uploadImage.mockRejectedValueOnce(new Error('fail'));

    await component.uploadImage({ target });
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
    expect(target.value).toBe('');

    // Success on upload
    const file2 = new File(['content2'], 'badge2.png', { type: 'image/png' });
    const target2 = { files: [file2], value: 'badge2.png' } as any;
    await component.uploadImage({ target: target2 });
    expect(component.badge.imageURL).toBe('https://cdn.example.com/uri-123');
    expect(target2.value).toBe('');
  });

  it('should check if field has an error', () => {
    component.errors = new Set(['name']);
    expect(component.hasFieldAnError('name')).toBe(true);
    expect(component.hasFieldAnError('description')).toBe(false);
  });

  it('should trigger delete alert, execute handler, and handle error', async () => {
    component.badge.badgeId = 'b-1';

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.deleteBadge();
    await doDelete();
    expect(mockBadges.delete).toHaveBeenCalledWith(component.badge);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(true);

    // Delete failure
    mockBadges.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.deleteBadge();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should close modal on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
