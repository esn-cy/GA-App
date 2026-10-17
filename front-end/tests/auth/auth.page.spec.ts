import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from '@app/auth/auth.page';
import { IDEAStorageService } from '@idea-ionic/common';
import { AppService } from '@app/app.service';

describe('AuthPage', () => {
  let page: AuthPage;
  let mockStorage: Partial<IDEAStorageService>;
  let mockApp: Partial<AppService>;

  beforeEach(() => {
    mockStorage = {
      set: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {};
    page = new AuthPage(mockStorage as IDEAStorageService, mockApp as AppService);
  });

  it('should initialize without errors when no token is present', async () => {
    await page.ngOnInit();
    expect(mockStorage.set).not.toHaveBeenCalled();
  });

  it('should parse JWT and save to storage if token is valid and unexpired', async () => {
    // Construct a mock JWT with future exp
    const payload = {
      userId: 'test.user',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const encodedPayload = btoa(JSON.stringify(payload));
    const token = `header.${encodedPayload}.signature`;

    // Stub window.location.assign in jsdom
    const originalLocation = window.location;
    const assignMock = vi.fn();
    delete (window as any).location;
    window.location = { ...originalLocation, assign: assignMock } as any;

    page.token = token;
    await page.ngOnInit();

    expect(mockStorage.set).toHaveBeenCalledWith('token', token);
    expect(mockStorage.set).toHaveBeenCalledWith('user', expect.objectContaining({ userId: 'test.user' }));
    expect(assignMock).toHaveBeenCalledWith('');

    (window as any).location = originalLocation;
  });

  it('should ignore expired token', async () => {
    const payload = {
      userId: 'expired.user',
      exp: Math.floor(Date.now() / 1000) - 3600
    };
    const encodedPayload = btoa(JSON.stringify(payload));
    const token = `header.${encodedPayload}.signature`;

    const originalLocation = window.location;
    const assignMock = vi.fn();
    delete (window as any).location;
    window.location = { ...originalLocation, assign: assignMock } as any;

    page.token = token;
    await page.ngOnInit();

    expect(mockStorage.set).not.toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('');

    (window as any).location = originalLocation;
  });

  it('should start login flow with ESN accounts', () => {
    const originalLocation = window.location;
    const assignMock = vi.fn();
    delete (window as any).location;
    window.location = { ...originalLocation, hostname: 'localhost', assign: assignMock } as any;

    page.startLoginFlowWithESNAccounts();
    expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('https://accounts.esn.org/cas/login?service='));

    window.location = { ...originalLocation, hostname: 'app.esn.org', assign: assignMock } as any;
    page.startLoginFlowWithESNAccounts();
    expect(assignMock).toHaveBeenCalledTimes(2);

    (window as any).location = originalLocation;
  });
});
