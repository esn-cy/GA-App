import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationStandaloneComponent } from '@tabs/opportunities/applications/application.component';
import { Application } from '@models/application.model';

describe('ApplicationStandaloneComponent', () => {
  let component: ApplicationStandaloneComponent;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockApplications: any;
  let mockApp: any;

  beforeEach(() => {
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockImplementation((k: string) => k)
    };
    mockApplications = {
      downloadAttachment: vi.fn().mockResolvedValue('https://download.url/doc.pdf')
    };
    mockApp = {
      openURL: vi.fn().mockResolvedValue(undefined)
    };

    component = new ApplicationStandaloneComponent(
      mockLoading,
      mockMessage,
      mockTranslations,
      mockApplications,
      mockApp
    );
  });

  it('should return correct color and label for application status', () => {
    const pendingApp = new Application({ applicationId: 'a-1' });
    expect(component.getApplicationColorByStatus(pendingApp)).toBe('medium');
    expect(component.getApplicationLabelByStatus(pendingApp)).toBe('OPPORTUNITIES.APPLICATION_STATUSES.PENDING');
    expect(component.getApplicationLabelByStatus(pendingApp, true)).toBe('O');

    const approvedApp = new Application({ applicationId: 'a-2', approvedAt: '2026-10-17T00:00:00.000Z' });
    expect(component.getApplicationColorByStatus(approvedApp)).toBe('ESNgreen');
    expect(component.getApplicationLabelByStatus(approvedApp)).toBe('OPPORTUNITIES.APPLICATION_STATUSES.APPROVED');

    const rejectedApp = new Application({ applicationId: 'a-3', rejectedAt: '2026-10-17T00:00:00.000Z' });
    expect(component.getApplicationColorByStatus(rejectedApp)).toBe('danger');
    expect(component.getApplicationLabelByStatus(rejectedApp)).toBe('OPPORTUNITIES.APPLICATION_STATUSES.REJECTED');
  });

  it('should download application attachment and open URL', async () => {
    component.application = new Application({ applicationId: 'a-1', opportunityId: 'opp-1' });
    await component.downloadApplicationAttachment('Resume.pdf');

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockApplications.downloadAttachment).toHaveBeenCalledWith(component.application, 'Resume.pdf');
    expect(mockApp.openURL).toHaveBeenCalledWith('https://download.url/doc.pdf');
    expect(mockLoading.hide).toHaveBeenCalled();

    mockApplications.downloadAttachment.mockRejectedValueOnce(new Error('fail'));
    await component.downloadApplicationAttachment('Resume.pdf');
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });
});
