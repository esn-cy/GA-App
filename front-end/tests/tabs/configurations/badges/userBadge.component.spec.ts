import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserBadgeComponent } from '@tabs/configurations/badges/userBadge.component';
import { PopoverController } from '@ionic/angular';
import { IDEATranslationsService } from '@idea-ionic/common';
import { BadgesService } from '@tabs/configurations/badges/badges.service';
import { AppService } from '@app/app.service';
import { BuiltInBadges, UserBadge } from '@models/badge.model';
import { TestBed } from '@angular/core/testing';

describe('UserBadgeComponent', () => {
  let component: UserBadgeComponent;
  let mockPopover: Partial<PopoverController>;
  let mockTranslations: Partial<IDEATranslationsService>;
  let mockBadges: Partial<BadgesService>;
  let mockApp: Partial<AppService>;

  beforeEach(() => {
    mockPopover = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockBadges = {
      markUserBadgeAsSeen: vi.fn().mockResolvedValue({}),
      getDetailOfUserBadge: vi.fn()
    };
    mockApp = {
      user: { userId: 'u-1' } as any
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PopoverController, useValue: mockPopover },
        { provide: IDEATranslationsService, useValue: mockTranslations },
        { provide: BadgesService, useValue: mockBadges },
        { provide: AppService, useValue: mockApp }
      ]
    });

    component = TestBed.runInInjectionContext(() => new UserBadgeComponent());
  });

  it('should initialize built-in badge and mark as seen if current user', async () => {
    component.userBadge = new UserBadge({ userId: 'u-1', badge: BuiltInBadges.NEWCOMER });
    await component.ngOnInit();

    expect(mockBadges.markUserBadgeAsSeen).toHaveBeenCalledWith(BuiltInBadges.NEWCOMER);
    expect(component.badge).toBeDefined();
    expect(component.badge?.badgeId).toBe(BuiltInBadges.NEWCOMER);
  });

  it('should initialize custom badge if found', async () => {
    component.userBadge = new UserBadge({ userId: 'other-user', badge: 'custom-badge' });
    (mockBadges.getDetailOfUserBadge as any).mockReturnValue({ badgeId: 'custom-badge', name: 'Custom' });

    await component.ngOnInit();
    expect(mockBadges.markUserBadgeAsSeen).not.toHaveBeenCalled();
    expect(component.badge?.name).toBe('Custom');
  });

  it('should fallback to NOT_FOUND when badge detail does not exist', async () => {
    component.userBadge = new UserBadge({ userId: 'other-user', badge: 'unknown' });
    (mockBadges.getDetailOfUserBadge as any).mockReturnValue(undefined);

    await component.ngOnInit();
    expect(component.badge?.badgeId).toBe('NOT_FOUND');
  });

  it('should dismiss popover on close()', () => {
    component.close();
    expect(mockPopover.dismiss).toHaveBeenCalled();
  });
});
