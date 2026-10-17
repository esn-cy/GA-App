import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationsPage } from '@tabs/configurations/configurations.page';
import { Configurations, EmailTemplates } from '@models/configurations.model';
import { Badge } from '@models/badge.model';

describe('ConfigurationsPage', () => {
  let page: ConfigurationsPage;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockConfigurations: any;
  let mockMedia: any;
  let mockBadges: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: true })
      })
    };
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
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
    mockConfigurations = {
      get: vi.fn().mockResolvedValue(new Configurations({
        appTitle: 'GA App',
        appSubtitle: 'Subtitle',
        supportEmail: 'support@example.com',
        administratorsIds: ['u-admin'],
        opportunitiesManagersIds: ['u-opp'],
        dashboardManagersIds: ['u-dash'],
        bannedUsersIds: ['u-banned']
      })),
      update: vi.fn().mockImplementation(async (c) => new Configurations(c))
    };
    mockMedia = {
      uploadImage: vi.fn().mockResolvedValue('uri-123')
    };
    mockBadges = {
      getList: vi.fn().mockResolvedValue([new Badge({ badgeId: 'b-1', name: 'Badge 1' })])
    };
    mockApp = {
      configurations: new Configurations(),
      getImageURLByURI: vi.fn().mockReturnValue('https://example.com/logo.png'),
      openURL: vi.fn()
    };

    page = new ConfigurationsPage(
      mockModalCtrl,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockConfigurations,
      mockMedia,
      mockBadges,
      mockApp
    );
  });

  it('should load configurations and badges on ngOnInit', async () => {
    await page.ngOnInit();
    expect(mockConfigurations.get).toHaveBeenCalled();
    expect(page.configurations?.appTitle).toBe('GA App');
    expect(page.badges?.length).toBe(1);
  });

  it('should update configurations and handle error', async () => {
    await page.ngOnInit();
    await page.updateConfigurations();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockConfigurations.update).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockLoading.hide).toHaveBeenCalled();

    mockConfigurations.update.mockRejectedValueOnce(new Error('fail'));
    await page.updateConfigurations();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should add users to lists via alert handler', async () => {
    await page.ngOnInit();

    let handler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    page.addAdministrator();
    expect(handler).toBeDefined();
    await handler({ userId: 'u-new-admin' });
    expect(mockConfigurations.update).toHaveBeenCalled();

    page.addOpportunitiesManager();
    page.addDashboardManager();
    page.addBannedUser();
  });

  it('should remove users from lists via alert handler', async () => {
    await page.ngOnInit();

    let handler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    page.removeAdministratorById('u-admin');
    expect(handler).toBeDefined();
    await handler();
    expect(mockConfigurations.update).toHaveBeenCalled();

    page.removeOpportunitiesManagerById('u-opp');
    page.removeDashboardManagerById('u-dash');
    page.removeBannedUserById('u-banned');
  });

  it('should change app title, subtitle, and support email via alerts', async () => {
    await page.ngOnInit();

    let titleHandler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      titleHandler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.changeAppTitle();
    await titleHandler({ appTitle: 'New Title' });

    let subtitleHandler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      subtitleHandler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.changeAppSubtitle();
    await subtitleHandler({ appSubtitle: 'New Subtitle' });

    let emailHandler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      emailHandler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.changeSupportEmail();
    await emailHandler({ supportEmail: 'new@example.com' });

    expect(mockConfigurations.update).toHaveBeenCalled();
  });

  it('should upload and reset app logo', async () => {
    await page.ngOnInit();

    const file = new File(['data'], 'logo.png', { type: 'image/png' });
    const target = { files: [file], value: 'logo.png' } as any;

    await page.uploadAppLogo({ target }, false);
    expect(mockMedia.uploadImage).toHaveBeenCalledWith(file);

    await page.uploadAppLogo({ target }, true);
    expect(mockMedia.uploadImage).toHaveBeenCalledWith(file);

    mockMedia.uploadImage.mockRejectedValueOnce(new Error('fail'));
    await page.uploadAppLogo({ target }, false);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    let resetHandler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      resetHandler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.resetAppLogo(false);
    await resetHandler();

    await page.resetAppLogo(true);
  });

  it('should toggle feature visibilities', async () => {
    await page.ngOnInit();

    await page.setVisibilityQATopicsFeature(true);
    await page.setVisibilityOpportunitiesFeature(true);
    await page.setVisibilityVotingFeature(true);
    await page.setVisibilityBadgesFeature(true);

    expect(mockConfigurations.update).toHaveBeenCalled();
  });

  it('should handle modal dismissal when managing custom badge', async () => {
    let dismissCb: any;
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockReturnValue({
        then: vi.fn().mockImplementation((cb: any) => {
          dismissCb = cb;
          return Promise.resolve();
        })
      })
    });

    await page.manageCustomBadge(new Badge({ badgeId: 'b-custom' }));
    expect(mockModalCtrl.create).toHaveBeenCalled();

    // With data false
    dismissCb({ data: false });

    // With data true and searchbar value
    page.badgesSearchbar = { value: 'test-badge' } as any;
    const filterSpy = vi.spyOn(page, 'filterBadges').mockResolvedValue(undefined);
    dismissCb({ data: true });
    expect(filterSpy).toHaveBeenCalledWith('test-badge', undefined, true);
  });

  it('should handle early returns when configurations is undefined', async () => {
    page.configurations = undefined as any;

    await page.updateConfigurations();
    await page.changeAppTitle();
    await page.changeAppSubtitle();
    await page.changeSupportEmail();
    await page.uploadAppLogo({ target: { files: [] } } as any, false);
    await page.resetAppLogo(false);
    page.addAdministrator();
    page.addOpportunitiesManager();
    page.addDashboardManager();
    page.addBannedUser();
    page.removeAdministratorById('u-1');
    page.removeOpportunitiesManagerById('u-1');
    page.removeDashboardManagerById('u-1');
    page.removeBannedUserById('u-1');
    await page.setVisibilityQATopicsFeature(true);
    await page.setVisibilityOpportunitiesFeature(true);
    await page.setVisibilityVotingFeature(true);
    await page.setVisibilityBadgesFeature(true);

    expect(mockLoading.show).not.toHaveBeenCalled();
  });

  it('should execute handlers for opportunities, dashboard managers, and banned users', async () => {
    await page.ngOnInit();

    // Add opportunities manager
    let handler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    page.addOpportunitiesManager();
    await handler({ userId: 'u-new-opp' });

    // Add dashboard manager
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    page.addDashboardManager();
    await handler({ userId: 'u-new-dash' });

    // Add banned user
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    page.addBannedUser();
    await handler({ userId: 'u-new-banned' });

    // Remove opportunities manager
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    page.removeOpportunitiesManagerById('u-opp');
    await handler();

    // Remove dashboard manager
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    page.removeDashboardManagerById('u-dash');
    await handler();

    // Remove banned user
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      handler = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    page.removeBannedUserById('u-banned');
    await handler();

    expect(mockConfigurations.update).toHaveBeenCalled();
  });

  it('should complete infinite scroll on filterBadges with timeout', async () => {
    vi.useFakeTimers();
    const scroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    page.badges = [new Badge({ badgeId: 'b-1' })];
    await page.filterBadges('', scroll);
    vi.advanceTimersByTime(150);
    expect(scroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should open badges modal and add custom badge', async () => {
    await page.openBadgesModal();
    expect(mockModalCtrl.create).toHaveBeenCalled();

    const manageSpy = vi.spyOn(page, 'manageCustomBadge').mockResolvedValue(undefined);
    await page.addCustomBadge();
    expect(manageSpy).toHaveBeenCalled();
  });

  it('should open template email modal', async () => {
    await page.openTemplateEmailModal(EmailTemplates.APPLICATION_APPROVED);
    expect(mockModalCtrl.create).toHaveBeenCalled();
  });
});
