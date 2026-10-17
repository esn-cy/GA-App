import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageOpportunityPage, PublishingOptions, UXMode } from '@tabs/opportunities/manageOpportunity.page';
import { Opportunity, OpportunityApplicationAttachment } from '@models/opportunity.model';

describe('ManageOpportunityPage', () => {
  let page: ManageOpportunityPage;
  let mockLocation: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockOpportunities: any;
  let mockApp: any;

  beforeEach(() => {
    mockLocation = {
      path: vi.fn().mockReturnValue('/opportunities/new/manage'),
      replaceState: vi.fn()
    };
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
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
    mockOpportunities = {
      getById: vi.fn().mockResolvedValue(new Opportunity({
        opportunityId: 'opp-1',
        name: 'Manager Opp',
        additionalManagersIds: ['user-1']
      })),
      insert: vi.fn().mockResolvedValue(new Opportunity({ opportunityId: 'opp-new', name: 'New Opp' })),
      update: vi.fn().mockResolvedValue(new Opportunity({ opportunityId: 'opp-1', name: 'Updated Opp' })),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      user: { userId: 'user-1', canManageOpportunities: true },
      closePage: vi.fn(),
      goToInTabs: vi.fn()
    };

    page = new ManageOpportunityPage(
      mockLocation,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockOpportunities,
      mockApp
    );
  });

  it('should initialize opportunity in VIEW mode when id provided', async () => {
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();

    expect(mockOpportunities.getById).toHaveBeenCalledWith('opp-1');
    expect(page.opportunity.name).toBe('Manager Opp');
    expect(page.editMode).toBe(UXMode.VIEW);
  });

  it('should initialize opportunity in INSERT mode when id is new', async () => {
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    expect(page.opportunity).toBeDefined();
    expect(page.editMode).toBe(UXMode.INSERT);
  });

  it('should close page when unauthorized', async () => {
    mockApp.user.canManageOpportunities = false;
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    expect(mockApp.closePage).toHaveBeenCalledWith('COMMON.UNAUTHORIZED');
  });

  it('should handle publishing options and deadline toggles', async () => {
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    page.publishingOption = PublishingOptions.PUBLISH;
    page.handleChangeOfPublishingOption();
    expect(page.opportunity.publishedSince).toBeDefined();

    page.publishingOption = PublishingOptions.DRAFT;
    page.handleChangeOfPublishingOption();
    expect(page.opportunity.publishedSince).toBeUndefined();

    page.hasDeadline = false;
    page.opportunity.willCloseAt = '2099-01-01T00:00:00.000Z';
    page.shouldResetDeadlineForApplications();
    expect(page.opportunity.willCloseAt).toBeUndefined();
  });

  it('should add and remove expected attachments and managers', async () => {
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    const att = new OpportunityApplicationAttachment({ name: 'CV' });
    page.opportunity.expectedAttachments.push(att);
    page.removeExpectedAttachment(att);
    expect(page.opportunity.expectedAttachments.length).toBe(0);

    page.opportunity.additionalManagersIds.push('user-2');
    page.removeOpportunityManagerById('user-2');
    expect(page.opportunity.additionalManagersIds.includes('user-2')).toBe(false);
  });

  it('should reorder expected attachments', async () => {
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    const att1 = new OpportunityApplicationAttachment({ name: 'CV' });
    const att2 = new OpportunityApplicationAttachment({ name: 'Motivation' });
    page.opportunity.expectedAttachments = [att1, att2];

    const mockDetail = {
      complete: vi.fn().mockImplementation((arr: any[]) => [arr[1], arr[0]])
    };
    page.reorderExpectedAttachments({ detail: mockDetail } as any);
    expect(mockDetail.complete).toHaveBeenCalled();
    expect(page.opportunity.expectedAttachments[0].name).toBe('Motivation');
  });

  it('should handle addExpectedAttachment modal callback (empty and valid name)', async () => {
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    let doAdd: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAdd = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.addExpectedAttachment();

    // Empty name does not add
    doAdd({ name: '' });
    expect(page.opportunity.expectedAttachments.length).toBe(0);

    // Valid name adds
    doAdd({ name: 'Portfolio' });
    expect(page.opportunity.expectedAttachments.length).toBe(1);
    expect(page.opportunity.expectedAttachments[0].name).toBe('Portfolio');
  });

  it('should handle addOpportunityManager modal callback (empty, duplicate, and valid)', async () => {
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();

    let doAdd: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAdd = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.addOpportunityManager();

    // Empty userId
    await doAdd({ userId: '' });
    expect(page.opportunity.additionalManagersIds).toEqual(['user-1']);

    // Duplicate userId
    await doAdd({ userId: 'USER-1' });
    expect(page.opportunity.additionalManagersIds).toEqual(['user-1']);

    // New valid userId
    await doAdd({ userId: 'User-2' });
    expect(page.opportunity.additionalManagersIds).toContain('user-2');
  });

  it('should handle getById failure on ionViewWillEnter', async () => {
    mockOpportunities.getById.mockRejectedValueOnce(new Error('fail'));
    page.opportunityId = 'opp-fail';
    await page.ionViewWillEnter();

    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.NOT_FOUND');
    expect(mockLoading.hide).toHaveBeenCalled();
  });

  it('should validate and save in INSERT and EDIT modes, handling errors', async () => {
    page.opportunityId = 'new';
    await page.ionViewWillEnter();

    // Validation error
    page.opportunity.name = '';
    await page.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');

    // Valid insert
    page.opportunity.name = 'Valid Opportunity';
    await page.save();
    expect(mockOpportunities.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(page.editMode).toBe(UXMode.VIEW);

    // Valid update
    page.enterEditMode();
    page.opportunity.name = 'Updated Opportunity';
    await page.save();
    expect(mockOpportunities.update).toHaveBeenCalled();
    expect(page.editMode).toBe(UXMode.VIEW);

    // Save failure
    page.enterEditMode();
    mockOpportunities.update.mockRejectedValueOnce(new Error('save fail'));
    await page.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute confirmation alert callbacks on status changes', async () => {
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();

    // Open
    let doAction: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.manageOpportunityStatus(true);
    await doAction();
    expect(mockOpportunities.open).toHaveBeenCalledWith(page.opportunity);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities', 'opp-1'], { back: true });

    // Close
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.manageOpportunityStatus(false);
    await doAction();
    expect(mockOpportunities.close).toHaveBeenCalledWith(page.opportunity);

    // Status change error
    mockOpportunities.open.mockRejectedValueOnce(new Error('status fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.manageOpportunityStatus(true);
    await doAction();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute confirmation alert callbacks on archive and unarchive', async () => {
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();

    // Archive
    let doAction: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveOpportunity(true);
    await doAction();
    expect(mockOpportunities.archive).toHaveBeenCalledWith(page.opportunity);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities', 'opp-1'], { back: true });

    // Unarchive
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveOpportunity(false);
    await doAction();
    expect(mockOpportunities.unarchive).toHaveBeenCalledWith(page.opportunity);

    // Archive error
    mockOpportunities.archive.mockRejectedValueOnce(new Error('archive fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveOpportunity(true);
    await doAction();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute delete and duplicate alert callbacks', async () => {
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();

    // Delete
    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteOpportunity();
    await doDelete();
    expect(mockOpportunities.delete).toHaveBeenCalledWith(page.opportunity);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities'], { back: true });

    // Delete error
    mockOpportunities.delete.mockRejectedValueOnce(new Error('del fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteOpportunity();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // Duplicate
    let doDuplicate: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateOpportunity();
    await doDuplicate();
    expect(mockOpportunities.insert).toHaveBeenCalled();
    expect(mockApp.goToInTabs).toHaveBeenCalled();

    // Duplicate error
    mockOpportunities.insert.mockRejectedValueOnce(new Error('dup fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateOpportunity();
    await doDuplicate();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should handle exitEditMode in INSERT and EDIT modes', async () => {
    // INSERT mode
    page.opportunityId = 'new';
    await page.ionViewWillEnter();
    page.exitEditMode();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['opportunities'], { back: true });

    // EDIT mode resets entity and UI helpers
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();
    page.enterEditMode();
    page.opportunity.name = 'Changed';
    page.exitEditMode();
    expect(page.editMode).toBe(UXMode.VIEW);
    expect(page.opportunity.name).toBe('Manager Opp');
  });

  it('should handle schedule publishing option and field error check', async () => {
    page.opportunityId = 'opp-1';
    await page.ionViewWillEnter();

    page.opportunity.publishedSince = '2099-01-01T00:00:00.000Z';
    (page as any).setUIHelpersForComplexFields();
    expect(page.publishingOption).toBe(PublishingOptions.SCHEDULE);

    page.opportunity.publishedSince = '2020-01-01T00:00:00.000Z';
    (page as any).setUIHelpersForComplexFields();
    expect(page.publishingOption).toBe(PublishingOptions.PUBLISH);

    page.errors = new Set(['name']);
    expect(page.hasFieldAnError('name')).toBe(true);
    expect(page.hasFieldAnError('description')).toBe(false);
  });
});
