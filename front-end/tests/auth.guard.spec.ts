import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NavController, Platform } from '@ionic/angular/common';
import { IDEAApiService, IDEAStorageService, IDEAWebSocketApiService } from '@idea-ionic/common';
import { AppService } from '@app/app.service';
import { authGuard } from '@app/auth.guard';
import { User } from '@models/user.model';

describe('authGuard', () => {
  let mockPlatform: Partial<Platform>;
  let mockNavCtrl: Partial<NavController>;
  let mockStorage: Partial<IDEAStorageService>;
  let mockApi: Partial<IDEAApiService>;
  let mockWebSocket: Partial<IDEAWebSocketApiService>;
  let mockApp: Partial<AppService>;

  beforeEach(() => {
    mockPlatform = {
      ready: vi.fn().mockResolvedValue('dom')
    };
    mockNavCtrl = {
      navigateRoot: vi.fn()
    };
    mockStorage = {
      ready: vi.fn().mockResolvedValue(true),
      get: vi.fn()
    };
    mockApi = {
      authToken: undefined
    };
    mockWebSocket = {
      authToken: undefined
    };
    mockApp = {
      authReady: false,
      user: undefined
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Platform, useValue: mockPlatform },
        { provide: NavController, useValue: mockNavCtrl },
        { provide: IDEAStorageService, useValue: mockStorage },
        { provide: IDEAApiService, useValue: mockApi },
        { provide: IDEAWebSocketApiService, useValue: mockWebSocket },
        { provide: AppService, useValue: mockApp }
      ]
    });
  });

  it('should return true immediately if auth is already ready', async () => {
    mockApp.authReady = true;
    const result = await TestBed.runInInjectionContext(() => (authGuard as any)());
    expect(result).toBe(true);
    expect(mockPlatform.ready).not.toHaveBeenCalled();
  });

  it('should load token and user, navigate to root, and return true when token is valid', async () => {
    (mockStorage.get as any).mockImplementation((key: string) => {
      if (key === 'tokenExpiresAt') return Promise.resolve(Date.now() + 100000);
      if (key === 'token') return Promise.resolve('test-token-123');
      if (key === 'user') return Promise.resolve({ _id: 'user-1', name: 'Andy' });
      return Promise.resolve(null);
    });

    const result = await TestBed.runInInjectionContext(() => (authGuard as any)());
    expect(result).toBe(true);
    expect(mockApi.authToken).toBe('test-token-123');
    expect(mockWebSocket.authToken).toBe('test-token-123');
    expect(mockApp.user).toBeInstanceOf(User);
    expect(mockApp.authReady).toBe(true);
  });

  it('should navigate to auth and resolve true if token is expired', async () => {
    (mockStorage.get as any).mockImplementation((key: string) => {
      if (key === 'tokenExpiresAt') return Promise.resolve(Date.now() - 1000);
      return Promise.resolve(null);
    });

    const result = await TestBed.runInInjectionContext(() => (authGuard as any)());
    expect(result).toBe(true);
    expect(mockNavCtrl.navigateRoot).toHaveBeenCalledWith(['auth']);
    expect(mockApp.authReady).toBe(true);
  });

  it('should navigate to auth if token is missing', async () => {
    (mockStorage.get as any).mockImplementation((key: string) => {
      if (key === 'tokenExpiresAt') return Promise.resolve(Date.now() + 100000);
      if (key === 'token') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await TestBed.runInInjectionContext(() => (authGuard as any)());
    expect(result).toBe(true);
    expect(mockNavCtrl.navigateRoot).toHaveBeenCalledWith(['auth']);
  });

  it('should navigate to [] when location pathname is /', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...originalLocation, pathname: '/' }
    });

    (mockStorage.get as any).mockImplementation((key: string) => {
      if (key === 'tokenExpiresAt') return Promise.resolve(Date.now() + 100000);
      if (key === 'token') return Promise.resolve('test-token-123');
      if (key === 'user') return Promise.resolve({ _id: 'user-1', name: 'Andy' });
      return Promise.resolve(null);
    });

    const result = await TestBed.runInInjectionContext(() => (authGuard as any)());
    expect(result).toBe(true);
    expect(mockNavCtrl.navigateRoot).toHaveBeenCalledWith([]);

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation
    });
  });

  it('should not navigate when location pathname is not /', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...originalLocation, pathname: '/t/topics' }
    });

    (mockStorage.get as any).mockImplementation((key: string) => {
      if (key === 'tokenExpiresAt') return Promise.resolve(Date.now() + 100000);
      if (key === 'token') return Promise.resolve('test-token-123');
      if (key === 'user') return Promise.resolve({ _id: 'user-1', name: 'Andy' });
      return Promise.resolve(null);
    });

    const result = await TestBed.runInInjectionContext(() => (authGuard as any)());
    expect(result).toBe(true);
    expect(mockNavCtrl.navigateRoot).not.toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation
    });
  });
});
