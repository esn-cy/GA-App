import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppService } from '@app/app.service';
import { AlertController, NavController, Platform } from '@ionic/angular';
import { IDEAApiService, IDEAMessageService, IDEAStorageService, IDEATranslationsService } from '@idea-ionic/common';
import { Configurations } from '@models/configurations.model';

describe('AppService', () => {
  let service: AppService;
  let mockPlatform: Partial<Platform>;
  let mockNavCtrl: Partial<NavController>;
  let mockAlertCtrl: Partial<AlertController>;
  let mockMessage: Partial<IDEAMessageService>;
  let mockStorage: Partial<IDEAStorageService>;
  let mockApi: Partial<IDEAApiService>;
  let mockTranslations: Partial<IDEATranslationsService>;

  beforeEach(() => {
    mockPlatform = {
      width: vi.fn().mockReturnValue(1200),
      is: vi.fn().mockReturnValue(false)
    };
    mockNavCtrl = {
      navigateBack: vi.fn(),
      navigateRoot: vi.fn(),
      navigateForward: vi.fn(),
      back: vi.fn()
    };
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() } as any)
    };
    mockMessage = {
      error: vi.fn()
    };
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    };
    mockApi = {
      authToken: 'test-token'
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };

    service = new AppService(
      mockPlatform as Platform,
      mockNavCtrl as NavController,
      mockAlertCtrl as AlertController,
      mockMessage as IDEAMessageService,
      mockStorage as IDEAStorageService,
      mockApi as IDEAApiService,
      mockTranslations as IDEATranslationsService
    );
    service.configurations = new Configurations({
      appTitle: 'GA App',
      appLogoURL: 'https://example.com/logo.png',
      appLogoURLDarkMode: 'https://example.com/logo-dark.png'
    });
  });

  it('should be created and initialized', () => {
    expect(service).toBeDefined();
    expect(service.initReady).toBe(false);
    expect(service.authReady).toBe(false);
    expect(typeof service.isDeveloperMode()).toBe('boolean');
    expect(typeof service.isInDarkMode()).toBe('boolean');
  });

  it('should detect mobile mode based on platform width', () => {
    mockPlatform.width = vi.fn().mockReturnValue(500);
    expect(service.isInMobileMode()).toBe(true);

    mockPlatform.width = vi.fn().mockReturnValue(1024);
    expect(service.isInMobileMode()).toBe(false);
  });

  it('should handle navigation properly', () => {
    service.goTo(['topics'], { back: true });
    expect(mockNavCtrl.navigateBack).toHaveBeenCalledWith(['topics'], { back: true });

    service.goTo(['topics'], { root: true });
    expect(mockNavCtrl.navigateRoot).toHaveBeenCalledWith(['topics'], { root: true });

    service.goTo(['topics']);
    expect(mockNavCtrl.navigateForward).toHaveBeenCalledWith(['topics'], {});
  });

  it('should prepend "t" for tabs navigation', () => {
    service.goToInTabs(['topics']);
    expect(mockNavCtrl.navigateForward).toHaveBeenCalledWith(['t', 'topics'], {});
  });

  it('should handle fallback avatar and image URLs', () => {
    const imgObj = { src: 'https://example.com/broken.jpg' };
    service.fallbackAvatar(imgObj);
    expect(imgObj.src).toContain('no-avatar.jpg');

    expect(service.getAvatarFallbackURL(false)).toContain('no-avatar.jpg');
    expect(service.getAvatarFallbackURL(true)).toContain('icon.svg');

    const uri = service.getImageURLByURI('test-img');
    expect(uri).toContain('test-img.png');
  });

  it('should get icon in light and dark mode', () => {
    expect(service.getIcon(false)).toBe('https://example.com/logo.png');
    expect(service.getIcon(true)).toBe('https://example.com/logo-dark.png');
  });

  it('should open token alert', async () => {
    await service.getTokenId();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
  });

  it('should close page with optional error message', () => {
    service.closePage('Error message');
    expect(mockMessage.error).toHaveBeenCalledWith('Error message');
    expect(mockNavCtrl.back).toHaveBeenCalled();

    mockNavCtrl.back = vi.fn().mockImplementation(() => {
      throw new Error('Cannot go back');
    });
    service.closePage(undefined, ['fallback']);
    expect(mockNavCtrl.navigateBack).toHaveBeenCalledWith(['fallback']);
  });

  it('should present app info alert and execute privacy policy handler', async () => {
    let capturedOptions: any;
    mockAlertCtrl.create = vi.fn().mockImplementation(async (opts) => {
      capturedOptions = opts;
      return { present: vi.fn() };
    });
    const openURLSpy = vi.spyOn(service, 'openURL').mockResolvedValue(undefined as any);

    await service.info();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
    expect(capturedOptions.buttons[0].handler).toBeDefined();
    await capturedOptions.buttons[0].handler();
    expect(openURLSpy).toHaveBeenCalledWith('Translated');
  });

  it('should present logout alert and execute logout handler', async () => {
    let capturedOptions: any;
    mockAlertCtrl.create = vi.fn().mockImplementation(async (opts) => {
      capturedOptions = opts;
      return { present: vi.fn() };
    });
    const reloadSpy = vi.spyOn(service, 'reloadApp').mockImplementation(() => {
    });

    await service.logout();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
    expect(capturedOptions.buttons[1].handler).toBeDefined();
    await capturedOptions.buttons[1].handler();
    expect(mockStorage.clear).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should reload app', () => {
    const originalLocation = window.location;
    const mockAssign = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...originalLocation, assign: mockAssign }
    });
    service.reloadApp();
    expect(mockAssign).toHaveBeenCalledWith('');
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation
    });
  });

  it('should respond to color scheme preference changes', () => {
    let changeHandler: ((e: any) => void) | undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, cb: any) => {
        if (event === 'change') changeHandler = cb;
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null
    } as any));

    const newService = new AppService(
      mockPlatform as Platform,
      mockNavCtrl as NavController,
      mockAlertCtrl as AlertController,
      mockMessage as IDEAMessageService,
      mockStorage as IDEAStorageService,
      mockApi as IDEAApiService,
      mockTranslations as IDEATranslationsService
    );

    expect(newService.isInDarkMode()).toBe(false);
    expect(changeHandler).toBeDefined();
    changeHandler?.({ matches: true });
    expect(newService.isInDarkMode()).toBe(true);
  });

  it('should open external URL with browser', async () => {
    await expect(service.openURL('https://esn.org')).resolves.toBeUndefined();
    mockPlatform.is = vi.fn().mockReturnValue(true); // iOS
    await expect(service.openURL('https://esn.org')).resolves.toBeUndefined();
  });

  it('should open user profile by id', async () => {
    await expect(service.openUserProfileById('user123')).resolves.toBeUndefined();
  });

  it('should download data as file', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    service.downloadDataAsFile('test data', 'text/plain', 'test.txt');
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('should calculate years since starting year', () => {
    const currentYear = new Date().getFullYear();
    const years = service.getYearsSince(currentYear - 2);
    expect(years).toEqual([currentYear, currentYear - 1, currentYear - 2]);
  });
});
