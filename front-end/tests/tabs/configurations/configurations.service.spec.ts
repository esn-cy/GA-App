import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationsService } from '@tabs/configurations/configurations.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Configurations, EmailTemplates } from '@models/configurations.model';

describe('ConfigurationsService', () => {
  let service: ConfigurationsService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      putResource: vi.fn(),
      patchResource: vi.fn()
    };
    service = new ConfigurationsService(mockApi as IDEAApiService);
  });

  it('should get configurations from back-end', async () => {
    (mockApi.getResource as any).mockResolvedValue({ appTitle: 'GA App' });
    const config = await service.get();
    expect(config).toBeInstanceOf(Configurations);
    expect(config.appTitle).toBe('GA App');
    expect(mockApi.getResource).toHaveBeenCalledWith('configurations');
  });

  it('should update configurations', async () => {
    const config = new Configurations({ appTitle: 'GA App 2' });
    (mockApi.putResource as any).mockResolvedValue({ appTitle: 'GA App 2' });
    const result = await service.update(config);
    expect(result).toBeInstanceOf(Configurations);
    expect(mockApi.putResource).toHaveBeenCalledWith('configurations', { body: config });
  });

  it('should ban a user by ID when not already banned', async () => {
    (mockApi.getResource as any).mockResolvedValue({ bannedUsersIds: ['user-1'] });
    (mockApi.putResource as any).mockResolvedValue({ bannedUsersIds: ['user-1', 'user-2'] });

    await service.banUserByID('user-2');
    expect(mockApi.putResource).toHaveBeenCalledWith('configurations', {
      body: expect.objectContaining({
        bannedUsersIds: ['user-1', 'user-2']
      })
    });
  });

  it('should not update if user is already banned', async () => {
    (mockApi.getResource as any).mockResolvedValue({ bannedUsersIds: ['user-1'] });
    await service.banUserByID('user-1');
    expect(mockApi.putResource).not.toHaveBeenCalled();
  });

  it('should manage email templates: set, reset, get, test', async () => {
    await service.setEmailTemplate(EmailTemplates.QUESTIONS, 'Welcome', 'Hello');
    expect(mockApi.patchResource).toHaveBeenCalledWith('configurations', {
      body: { action: 'SET_EMAIL_TEMPLATE', template: EmailTemplates.QUESTIONS, subject: 'Welcome', content: 'Hello' }
    });

    await service.resetEmailTemplate(EmailTemplates.QUESTIONS);
    expect(mockApi.patchResource).toHaveBeenCalledWith('configurations', {
      body: { action: 'RESET_EMAIL_TEMPLATE', template: EmailTemplates.QUESTIONS }
    });

    (mockApi.patchResource as any).mockResolvedValue({ subject: 'Sub', content: 'Con' });
    const tpl = await service.getEmailTemplate(EmailTemplates.QUESTIONS);
    expect(tpl).toEqual({ subject: 'Sub', content: 'Con' });

    await service.testEmailTemplate(EmailTemplates.QUESTIONS);
    expect(mockApi.patchResource).toHaveBeenCalledWith('configurations', {
      body: { action: 'TEST_EMAIL_TEMPLATE', template: EmailTemplates.QUESTIONS }
    });
  });
});
