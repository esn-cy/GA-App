import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProfilePage } from '@tabs/profile/profile.page';
import { PopoverController } from '@ionic/angular';
import { IDEATranslationsService } from '@idea-ionic/common';
import { BadgesService } from '@tabs/configurations/badges/badges.service';
import { AppService } from '@app/app.service';
import { UserBadge } from '@models/badge.model';

describe('ProfilePage', () => {
  let page: ProfilePage;
  let mockPopover: Partial<PopoverController>;
  let mockTranslations: Partial<IDEATranslationsService>;
  let mockBadgesService: Partial<BadgesService>;
  let mockApp: Partial<AppService>;

  const mockBadgesList: UserBadge[] = [
    { badge: 'FIRST_QUESTION', userId: 'user-1' } as any
  ];

  beforeEach(() => {
    mockPopover = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() } as any)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Feedback Subject')
    };
    mockBadgesService = {
      getList: vi.fn().mockResolvedValue([]),
      getListOfUserById: vi.fn().mockResolvedValue(mockBadgesList)
    };
    mockApp = {
      user: { userId: 'user-1' } as any,
      configurations: { supportEmail: 'support@esncy.org' } as any,
      openURL: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ProfilePage,
        { provide: PopoverController, useValue: mockPopover },
        { provide: IDEATranslationsService, useValue: mockTranslations },
        { provide: BadgesService, useValue: mockBadgesService },
        { provide: AppService, useValue: mockApp }
      ]
    });

    page = TestBed.inject(ProfilePage);
  });

  it('should create and load badges list on ngOnInit', async () => {
    expect(page).toBeDefined();
    await page.ngOnInit();
    expect(mockBadgesService.getList).toHaveBeenCalled();
  });

  it('should load user badges on ionViewDidEnter', async () => {
    await page.ionViewDidEnter();
    expect(mockBadgesService.getListOfUserById).toHaveBeenCalledWith('user-1');
    expect(page.userBadges).toEqual(mockBadgesList);
  });

  it('should generate support email URL on sendFeedback', async () => {
    await page.sendFeedback();
    expect(mockApp.openURL).toHaveBeenCalledWith(
      expect.stringContaining('mailto:support@esncy.org?subject=Feedback%20Subject')
    );
  });

  it('should open user badge details popover', async () => {
    const badge = new UserBadge({ badge: 'FIRST_QUESTION' } as any);
    await page.openUserBadgeDetails(badge);
    expect(mockPopover.create).toHaveBeenCalledWith(
      expect.objectContaining({
        componentProps: { userBadge: badge },
        cssClass: 'badgePopover'
      })
    );
  });
});
