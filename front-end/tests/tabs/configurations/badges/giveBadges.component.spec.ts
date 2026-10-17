import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GiveBadgesComponent } from '@tabs/configurations/badges/giveBadges.component';
import { Badge, UserBadge } from '@models/badge.model';

describe('GiveBadgesComponent', () => {
  let component: GiveBadgesComponent;
  let mockPopoverCtrl: any;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockBadges: any;
  let mockApp: any;

  beforeEach(() => {
    mockPopoverCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue({
        present: vi.fn(),
        onDidDismiss: vi.fn().mockResolvedValue({ data: { value: 'b-custom' } })
      })
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
    mockBadges = {
      getList: vi.fn().mockResolvedValue([new Badge({ badgeId: 'b-1', name: 'Custom' })]),
      getListOfUserById: vi.fn().mockResolvedValue([new UserBadge({ userId: 'u-1', badge: 'b-1' })]),
      addBadgeToUser: vi.fn().mockResolvedValue(undefined),
      removeBadgeFromUser: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {};

    component = new GiveBadgesComponent(
      mockPopoverCtrl,
      mockModalCtrl,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockBadges,
      mockApp
    );
  });

  it('should load badge list on ngOnInit', async () => {
    await component.ngOnInit();
    expect(mockBadges.getList).toHaveBeenCalled();
    expect(component.badges?.length).toBe(1);
  });

  it('should get badges for user and handle errors', async () => {
    // Empty userId
    await component.getUserBadges('');
    expect(mockBadges.getListOfUserById).not.toHaveBeenCalled();

    // Valid userId
    await component.getUserBadges('U-1');
    expect(mockBadges.getListOfUserById).toHaveBeenCalledWith('u-1');
    expect(component.usersBadges?.length).toBe(1);

    // Error handling
    mockBadges.getListOfUserById.mockRejectedValueOnce(new Error('fail'));
    await component.getUserBadges('U-1');
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.SOMETHING_WENT_WRONG');
  });

  it('should open details popover on openUserBadgeDetails', async () => {
    const ub = new UserBadge({ userId: 'u-1', badge: 'b-1' });
    await component.openUserBadgeDetails(ub);
    expect(mockPopoverCtrl.create).toHaveBeenCalled();
  });

  it('should present alert to remove badge from user, execute handler, and handle error', async () => {
    const ub = new UserBadge({ userId: 'u-1', badge: 'b-1' });
    component.usersBadges = [ub];

    let doRemove: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doRemove = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.removeBadgeFromUser('u-1', ub);
    await doRemove();
    expect(mockBadges.removeBadgeFromUser).toHaveBeenCalledWith('u-1', 'b-1');
    expect(component.usersBadges.length).toBe(0);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');

    // Removal error
    mockBadges.removeBadgeFromUser.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doRemove = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.removeBadgeFromUser('u-1', ub);
    await doRemove();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should open suggestions modal to add badge to user, add badge, and handle error', async () => {
    component.usersBadges = [];

    let dismissCb: any;
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          dismissCb = cb;
        }
      }))
    }));
    await component.addBadgeToUser('u-1');
    await dismissCb({ data: { value: 'b-custom' } });
    expect(mockBadges.addBadgeToUser).toHaveBeenCalledWith('u-1', 'b-custom');
    expect(component.usersBadges.length).toBe(1);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');

    // Null data dismiss
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          dismissCb = cb;
        }
      }))
    }));
    await component.addBadgeToUser('u-1');
    await dismissCb({ data: null });

    // Error on add
    mockBadges.addBadgeToUser.mockRejectedValueOnce(new Error('fail'));
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          dismissCb = cb;
        }
      }))
    }));
    await component.addBadgeToUser('u-1');
    await dismissCb({ data: { value: 'b-error' } });
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should close modal on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
