import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Platform } from '@ionic/angular';
import { IDEAStorageService, IDEATranslationsService } from '@idea-ionic/common';
import { AppService } from '@app/app.service';
import { ConfigurationsService } from '@tabs/configurations/configurations.service';
import { initGuard } from '@app/init.guard';
import { ServiceLanguages } from '@models/serviceLanguages.enum';

describe('initGuard', () => {
  let mockPlatform: Partial<Platform>;
  let mockTitle: Partial<Title>;
  let mockStorage: Partial<IDEAStorageService>;
  let mockTranslations: Partial<IDEATranslationsService>;
  let mockApp: Partial<AppService>;
  let mockConfigurations: Partial<ConfigurationsService>;

  beforeEach(() => {
    mockPlatform = {
      ready: vi.fn().mockResolvedValue('dom')
    };
    mockTitle = {
      setTitle: vi.fn()
    };
    mockStorage = {
      ready: vi.fn().mockResolvedValue(true)
    };
    mockTranslations = {
      init: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      initReady: false,
      configurations: undefined
    };
    mockConfigurations = {
      get: vi.fn().mockResolvedValue({ appTitle: 'GA App Cyprus', timezone: 'Asia/Nicosia' })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Platform, useValue: mockPlatform },
        { provide: Title, useValue: mockTitle },
        { provide: IDEAStorageService, useValue: mockStorage },
        { provide: IDEATranslationsService, useValue: mockTranslations },
        { provide: AppService, useValue: mockApp },
        { provide: ConfigurationsService, useValue: mockConfigurations }
      ]
    });
  });

  it('should return true immediately if init is already ready', async () => {
    mockApp.initReady = true;
    const result = await TestBed.runInInjectionContext(() => (initGuard as any)());
    expect(result).toBe(true);
    expect(mockPlatform.ready).not.toHaveBeenCalled();
  });

  it('should initialize translations, load configurations, set title and return true', async () => {
    const result = await TestBed.runInInjectionContext(() => (initGuard as any)());
    expect(result).toBe(true);
    expect(mockTranslations.init).toHaveBeenCalledWith(Object.values(ServiceLanguages), ServiceLanguages.English);
    expect(mockConfigurations.get).toHaveBeenCalled();
    expect(mockTitle.setTitle).toHaveBeenCalledWith('GA App Cyprus');
    expect(mockApp.initReady).toBe(true);
  });
});
