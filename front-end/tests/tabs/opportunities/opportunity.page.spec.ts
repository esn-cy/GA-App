import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpportunityPage } from '@tabs/opportunities/opportunity.page';
import { Opportunity } from '@models/opportunity.model';
import { Application } from '@models/application.model';

describe('OpportunityPage', () => {
  let page: OpportunityPage;
  let mockAlertCtrl: any;
  let mockModalCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockOpportunities: any;
  let mockApplications: any;
  let mockAttachments: any;
  let mockApp: any;

  beforeEach(() => {
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
    };
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: undefined })
      })
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      warning: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockOpportunities = {
      getById: vi.fn().mockResolvedValue(new Opportunity({
        opportunityId: 'opp-1',
        name: 'Call for Chair',
        contactEmail: 'contact@example.com'
      })),
      canUserApply: vi.fn().mockReturnValue(true)
    };
    mockApplications = {
      getListOfOpportunity: vi.fn().mockResolvedValue([]),
      getUserApplication: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockResolvedValue(new Application({ applicationId: 'app-1' })),
      update: vi.fn().mockResolvedValue(new Application({ applicationId: 'app-1' })),
      delete: vi.fn().mockResolvedValue(undefined),
      uploadAttachment: vi.fn().mockResolvedValue('att-123')
    };
    mockAttachments = {
      download: vi.fn().mockResolvedValue('https://download.url')
    };
    mockApp = {
      user: {
        userId: 'user-1',
        firstName: 'User',
        lastName: 'One',
        email: 'user@example.com'
      },
      goToInTabs: vi.fn(),
      openURL: vi.fn()
    };

    page = new OpportunityPage(
      mockAlertCtrl,
      mockModalCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockOpportunities,
      mockApplications,
      mockAttachments,
      mockApp
    );
    page.opportunityId = 'opp-1';
    page.content = { scrollToTop: vi.fn().mockResolvedValue(undefined) } as any;
  });

  it('should load opportunity and user applications on ionViewWillEnter and handle error', async () => {
    mockApplications.getListOfOpportunity.mockResolvedValueOnce([new Application({
      applicationId: 'app-user',
      userId: 'user-1'
    })]);
    await page.ionViewWillEnter();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockOpportunities.getById).toHaveBeenCalledWith('opp-1');
    expect(mockApplications.getListOfOpportunity).toHaveBeenCalled();
    expect(page.opportunity?.name).toBe('Call for Chair');
    expect(page.userApplication?.userId).toBe('user-1');
    expect(mockLoading.hide).toHaveBeenCalled();

    mockOpportunities.getById.mockRejectedValueOnce(new Error('fail'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should handle refresher on handleRefresh', async () => {
    const mockRefresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(mockRefresher);
    expect(mockRefresher.complete).toHaveBeenCalled();
  });

  it('should navigate to manage page', async () => {
    await page.ionViewWillEnter();
    page.manageOpportunity();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities', 'opp-1', 'manage']);
  });

  it('should download opportunity attachment and browse files', async () => {
    await page.ionViewWillEnter();
    await page.downloadOpportunityAttachment({ name: 'file' } as any);
    expect(mockAttachments.download).toHaveBeenCalled();
    expect(mockApp.openURL).toHaveBeenCalledWith('https://download.url');

    mockAttachments.download.mockRejectedValueOnce(new Error('fail'));
    await page.downloadOpportunityAttachment({ name: 'file' } as any);
    expect(mockMessage.error).toHaveBeenCalled();

    const input = document.createElement('input');
    input.id = 'file-input-id';
    document.body.appendChild(input);
    page.browseFilesForInputId('file-input-id');
    document.body.removeChild(input);
  });

  it('should add and remove attachments to application', async () => {
    await page.ionViewWillEnter();
    page.startApplication();

    const file = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
    const target = { files: [file], value: 'cv.pdf' } as any;

    await page.addAttachment({ target }, 'cv');
    expect(mockApplications.uploadAttachment).toHaveBeenCalledWith(page.opportunity, file);
    expect(page.userApplication?.attachments['cv']).toBeDefined();

    page.removeAttachmentByExpectedName('cv');
    expect(page.userApplication?.attachments['cv']).toBeUndefined();

    // Upload error branch
    mockApplications.uploadAttachment.mockRejectedValueOnce(new Error('upload failed'));
    await page.addAttachment({ target }, 'cv');
    expect(mockMessage.error).toHaveBeenCalledWith('upload failed', { dontTranslate: true });
    expect(page.attachmentUploadErrors['cv']).toBe('upload failed');

    // File too large branch
    const bigFile = new File(['content'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 100 * 1024 * 1024 });
    await page.addAttachment({ target: { files: [bigFile], value: 'big.pdf' } as any }, 'cv');
    expect(mockMessage.error).toHaveBeenCalled();

    // Remove attachment with event
    const mockEv = { stopPropagation: vi.fn() } as any;
    page.removeAttachmentByExpectedName('cv', mockEv);
    expect(mockEv.stopPropagation).toHaveBeenCalled();

    // Early return when target has no files
    await page.addAttachment({ target: null as any }, 'cv');
  });

  it('should manage application state: start, fix, cancel, and start writing', () => {
    page.startApplication();
    expect(page.writingApplication).toBe(true);
    expect(page.userApplication?.userId).toBe('user-1');

    page.cancelApplication();
    expect(page.writingApplication).toBe(false);
    expect(page.userApplication).toBeUndefined();

    page.userApplication = new Application({ applicationId: 'app-1', userId: 'user-1' });
    page.fixUserApplication();
    expect(page.writingApplication).toBe(true);

    page.cancelApplication();
    expect(page.writingApplication).toBe(false);
    expect(page.userApplication).toBeDefined(); // preserved because applicationId is set
  });

  it('should validate and send new application (insert) and update application (update) with error handling', async () => {
    // Guards when opportunity or userApplication is undefined
    page.opportunity = undefined;
    await page.sendApplication();
    await page.withdrawUserApplication();
    page.manageOpportunity();
    await page.reviewApplication(new Application());
    await page.sendQuestionAsEmail();

    await page.ionViewWillEnter();
    page.startApplication();

    // Validation error
    await page.sendApplication();
    expect(mockMessage.error).toHaveBeenCalled();
    expect(page.hasFieldAnError('motivation')).toBe(true);

    // Valid insertion
    page.userApplication!.motivation = 'Passionate about chairing';
    let doSend: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.sendApplication();
    await doSend();
    expect(mockApplications.insert).toHaveBeenCalled();

    // Send error handling
    page.userApplication = new Application({ motivation: 'Fail motivation' });
    mockApplications.insert.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.sendApplication();
    await doSend();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // Valid update
    page.userApplication = new Application({ applicationId: 'app-1', motivation: 'Updated motivation' });
    page.writingApplication = true;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.sendApplication();
    await doSend();
    expect(mockApplications.update).toHaveBeenCalled();
  });

  it('should open confirmation alert and withdraw user application with error handling', async () => {
    await page.ionViewWillEnter();
    page.userApplication = new Application({ applicationId: 'app-1', userId: 'user-1' });
    page.applications = [page.userApplication];

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await page.withdrawUserApplication();
    expect(doDelete).toBeDefined();
    await doDelete();
    expect(mockApplications.delete).toHaveBeenCalledWith(page.opportunity, expect.any(Application));
    expect(page.userApplication).toBeUndefined();

    // Delete error handling
    page.userApplication = new Application({ applicationId: 'app-2', userId: 'user-1' });
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockApplications.delete.mockRejectedValueOnce(new Error('fail'));
    await page.withdrawUserApplication();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should open mailto link on sendQuestionAsEmail and ignore if no email', async () => {
    await page.ionViewWillEnter();
    await page.sendQuestionAsEmail();
    expect(mockApp.openURL).toHaveBeenCalledWith(expect.stringContaining('mailto:contact@example.com'));

    (page.opportunity as any).contactEmail = undefined;
    await page.sendQuestionAsEmail();
  });

  it('should get application color by status', () => {
    const appApproved = new Application({ approvedAt: new Date().toISOString() });
    expect(page.getApplicationColorByStatus(appApproved)).toBe('ESNgreen');

    const appRejected = new Application({ rejectedAt: new Date().toISOString() });
    expect(page.getApplicationColorByStatus(appRejected)).toBe('danger');

    const appPending = new Application();
    expect(page.getApplicationColorByStatus(appPending)).toBe('medium');
  });

  it('should open review application modal', async () => {
    await page.ionViewWillEnter();
    const app = new Application({ applicationId: 'app-1' });
    await page.reviewApplication(app);
    expect(mockModalCtrl.create).toHaveBeenCalled();
  });
});
