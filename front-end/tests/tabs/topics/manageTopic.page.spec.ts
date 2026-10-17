import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageTopicPage, PublishingOptions, UXMode } from '@tabs/topics/manageTopic.page';
import { Topic, TopicTypes } from '@models/topic.model';
import { Subject, SubjectTypes } from '@models/subject.model';
import { TopicCategoryAttached } from '@models/category.model';
import { GAEventAttached } from '@models/event.model';

describe('ManageTopicPage', () => {
  let page: ManageTopicPage;
  let mockLocation: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockTopics: any;
  let mockMedia: any;
  let mockApp: any;

  beforeEach(() => {
    mockLocation = {
      path: vi.fn().mockReturnValue('/topics/new-standard/manage'),
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
    mockTopics = {
      getActiveList: vi.fn().mockResolvedValue([
        new Topic({ topicId: 'top-1', name: 'Active Topic 1', type: TopicTypes.STANDARD }),
        new Topic({ topicId: 'top-2', name: 'Second Topic', type: TopicTypes.STANDARD })
      ]),
      getById: vi.fn().mockResolvedValue(new Topic({
        topicId: 'top-1',
        name: 'Standard Topic',
        type: TopicTypes.STANDARD,
        category: new TopicCategoryAttached({ categoryId: 'cat-1', name: 'Cat' }),
        event: new GAEventAttached({ eventId: 'ev-1', name: 'Event' }),
        subjects: [new Subject({ id: 's-1', name: 'Speaker 1', type: SubjectTypes.USER, section: 'S', country: 'C' })]
      })),
      getRelated: vi.fn().mockResolvedValue([new Topic({ topicId: 'top-2' })]),
      insert: vi.fn().mockResolvedValue(new Topic({
        topicId: 'top-new',
        name: 'New Topic',
        type: TopicTypes.STANDARD
      })),
      update: vi.fn().mockResolvedValue(new Topic({
        topicId: 'top-1',
        name: 'Updated Topic',
        type: TopicTypes.STANDARD
      })),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      linkByIds: vi.fn().mockResolvedValue(undefined),
      unlinkByIds: vi.fn().mockResolvedValue(undefined)
    };
    mockMedia = {
      uploadImage: vi.fn().mockResolvedValue('uri-img')
    };
    mockApp = {
      user: {
        userId: 'u-admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        section: 'Section',
        country: 'Country',
        isAdministrator: true
      },
      closePage: vi.fn(),
      goToInTabs: vi.fn(),
      getImageURLByURI: vi.fn().mockReturnValue('https://example.com/avatar.png')
    };

    page = new ManageTopicPage(
      mockLocation,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockTopics,
      mockMedia,
      mockApp
    );
  });

  it('should initialize existing topic in VIEW mode', async () => {
    page.topicId = 'top-1';
    await page.ionViewWillEnter();

    expect(mockTopics.getById).toHaveBeenCalledWith('top-1');
    expect(page.topic.name).toBe('Standard Topic');
    expect(page.editMode).toBe(UXMode.VIEW);
  });

  it('should initialize new topic in INSERT mode', async () => {
    page.topicId = 'new-standard';
    await page.ionViewWillEnter();

    expect(page.topic).toBeDefined();
    expect(page.topic.type).toBe(TopicTypes.STANDARD);
    expect(page.editMode).toBe(UXMode.INSERT);
  });

  it('should block non-administrator', async () => {
    mockApp.user.isAdministrator = false;
    await page.ionViewWillEnter();
    expect(mockApp.closePage).toHaveBeenCalledWith('COMMON.UNAUTHORIZED');
  });

  it('should manage subjects: add, remove, addFirstSubjectWithUserData', async () => {
    page.topicId = 'new-standard';
    await page.ionViewWillEnter();

    page.addFirstSubjectWithUserData();
    expect(page.topic.subjects.length).toBe(1);

    page.addSubject();
    expect(page.topic.subjects.length).toBe(2);

    page.removeSubject(page.topic.subjects[0]);
    expect(page.topic.subjects.length).toBe(1);
  });

  it('should handle publishing options and deadlines', async () => {
    page.topicId = 'new-standard';
    await page.ionViewWillEnter();

    page.publishingOption = PublishingOptions.PUBLISH;
    page.handleChangeOfPublishingOption();
    expect(page.topic.publishedSince).toBeDefined();

    page.hasDeadlineForQuestions = false;
    page.topic.willCloseAt = '2099-01-01T00:00:00.000Z';
    page.shouldResetDeadlineForQuestions();
    expect(page.topic.willCloseAt).toBeUndefined();

    page.hasDeadlineForAnswers = false;
    page.topic.acceptAnswersUntil = '2099-01-01T00:00:00.000Z';
    page.shouldResetDeadlineForAnswers();
    expect(page.topic.acceptAnswersUntil).toBeUndefined();
  });

  it('should validate and insert topic on save', async () => {
    page.topicId = 'new-standard';
    await page.ionViewWillEnter();

    page.topic.name = 'Valid Standard Topic';
    page.topic.category = new TopicCategoryAttached({ categoryId: 'cat-1', name: 'Cat' });
    page.topic.event = new GAEventAttached({ eventId: 'ev-1', name: 'Ev' });
    page.topic.subjects = [new Subject({
      id: 's-1',
      name: 'Speaker 1',
      type: SubjectTypes.USER,
      section: 'S',
      country: 'C'
    })];

    await page.save();
    expect(mockTopics.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(page.editMode).toBe(UXMode.VIEW);
  });

  it('should initialize new live topic in INSERT mode with closedAt', async () => {
    page.topicId = 'new-live';
    await page.ionViewWillEnter();

    expect(page.topic).toBeDefined();
    expect(page.topic.type).toBe(TopicTypes.LIVE);
    expect(page.topic.closedAt).toBeDefined();
    expect(page.editMode).toBe(UXMode.INSERT);
  });

  it('should handle topic not found on ionViewWillEnter', async () => {
    mockTopics.getById.mockRejectedValueOnce(new Error('not found'));
    page.topicId = 'top-invalid';
    await page.ionViewWillEnter();

    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.NOT_FOUND');
    expect(mockLoading.hide).toHaveBeenCalled();
  });

  it('should configure rolesAbleToInteract from check list', async () => {
    page.topicId = 'new-standard';
    await page.ionViewWillEnter();

    // All checked -> empty array (meaning all roles can interact)
    page.rolesAbleToInteractChecks.forEach(c => (c.checked = true));
    page.setRolesAbleToInteractFromChecks();
    expect(page.topic.rolesAbleToInteract).toEqual([]);

    // Specific roles checked
    page.rolesAbleToInteractChecks.forEach(c => (c.checked = false));
    page.rolesAbleToInteractChecks[0].checked = true;
    page.setRolesAbleToInteractFromChecks();
    expect(page.topic.rolesAbleToInteract).toEqual([page.rolesAbleToInteractChecks[0].value]);
  });

  it('should handle save validation errors and update mode with related topics linking', async () => {
    page.topicId = 'top-1';
    await page.ionViewWillEnter();

    page.enterEditMode();
    expect(page.editMode).toBe(UXMode.EDIT);

    // Validation failure
    page.topic.name = '';
    await page.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');

    // Valid update
    page.topic.name = 'Valid Topic';
    page.relatedTopics = [new Topic({ topicId: 'top-old', name: 'Old' })];
    page.relatedTopicsChecks = [
      { checked: true, value: 'top-new-rel', name: 'New Rel', category1: TopicTypes.STANDARD } as any,
      { checked: false, value: 'top-old', name: 'Old', category1: TopicTypes.STANDARD } as any
    ];

    await page.save();
    expect(mockTopics.update).toHaveBeenCalled();
    expect(mockTopics.unlinkByIds).toHaveBeenCalledWith('top-1', 'top-old');
    expect(mockTopics.linkByIds).toHaveBeenCalledWith('top-1', 'top-new-rel');
    expect(page.editMode).toBe(UXMode.VIEW);
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');

    // Test error handling in unlink/link
    mockTopics.unlinkByIds.mockRejectedValueOnce(new Error('unlink fail'));
    mockTopics.linkByIds.mockRejectedValueOnce(new Error('link fail'));
    page.relatedTopics = [new Topic({ topicId: 'top-old-2', name: 'Old 2' })];
    page.relatedTopicsChecks = [{ checked: true, value: 'top-new-2', name: 'New 2' } as any];
    await (page as any).handleChangesInRelated();

    // Test save failure
    page.topic.name = 'Valid Topic';
    page.topic.category = new TopicCategoryAttached({ categoryId: 'cat-1', name: 'Cat' });
    page.topic.event = new GAEventAttached({ eventId: 'ev-1', name: 'Ev' });
    page.topic.subjects = [new Subject({
      id: 's-1',
      name: 'Speaker 1',
      type: SubjectTypes.USER,
      section: 'S',
      country: 'C'
    })];
    mockTopics.update.mockRejectedValueOnce(new Error('save fail'));
    page.editMode = UXMode.EDIT;
    await page.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute status change alert callbacks (open and close)', async () => {
    page.topicId = 'top-1';
    await page.ionViewWillEnter();

    // Open topic
    let doAction: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.manageTopicStatus(true);
    await doAction();
    expect(mockTopics.open).toHaveBeenCalledWith(page.topic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-1', 'standard'], { back: true });

    // Close topic
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.manageTopicStatus(false);
    await doAction();
    expect(mockTopics.close).toHaveBeenCalledWith(page.topic);

    // Error handling
    mockTopics.open.mockRejectedValueOnce(new Error('open fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.manageTopicStatus(true);
    await doAction();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute archive and unarchive alert callbacks', async () => {
    page.topicId = 'top-1';
    await page.ionViewWillEnter();

    // Archive
    let doAction: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveTopic(true);
    await doAction();
    expect(mockTopics.archive).toHaveBeenCalledWith(page.topic);

    // Unarchive
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveTopic(false);
    await doAction();
    expect(mockTopics.unarchive).toHaveBeenCalledWith(page.topic);

    // Error handling
    mockTopics.archive.mockRejectedValueOnce(new Error('archive fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAction = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveTopic(true);
    await doAction();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute delete alert callbacks including linked error branch', async () => {
    page.topicId = 'top-1';
    await page.ionViewWillEnter();

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteTopic();
    await doDelete();
    expect(mockTopics.delete).toHaveBeenCalledWith(page.topic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics'], { back: true });

    // Linked error
    mockTopics.delete.mockRejectedValueOnce(new Error('Unlink related topics first'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteTopic();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('TOPICS.CANT_DELETE_IF_LINKED_ERROR');

    // General error
    mockTopics.delete.mockRejectedValueOnce(new Error('other fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteTopic();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should execute duplicate alert callbacks for standard and live topics', async () => {
    page.topicId = 'top-1';
    await page.ionViewWillEnter();

    let doDuplicate: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateTopic();
    await doDuplicate();
    expect(mockTopics.insert).toHaveBeenCalled();
    expect(mockApp.goToInTabs).toHaveBeenCalled();

    // Duplicate live topic
    page.topic.type = TopicTypes.LIVE;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateTopic();
    await doDuplicate();
    expect(page.topic.closedAt).toBeDefined();

    // Error handling
    mockTopics.insert.mockRejectedValueOnce(new Error('dup fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateTopic();
    await doDuplicate();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should handle exitEditMode in INSERT and EDIT modes', async () => {
    // INSERT mode exits by navigating back
    page.topicId = 'new-standard';
    await page.ionViewWillEnter();
    page.exitEditMode();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics'], { back: true });

    // EDIT mode resets entity and UI helpers
    page.topicId = 'top-1';
    await page.ionViewWillEnter();
    page.enterEditMode();
    page.topic.name = 'Changed';
    page.exitEditMode();
    expect(page.editMode).toBe(UXMode.VIEW);
    expect(page.topic.name).toBe('Standard Topic');
  });

  it('should handle image upload for subject including empty file and failure', async () => {
    const subject = new Subject({ name: 'Speaker' });

    // Empty files list
    await page.uploadImageForSubject(subject, { target: { files: [] } as any });
    expect(mockMedia.uploadImage).not.toHaveBeenCalled();

    // Valid file
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    const target = { files: [file], value: 'photo.png' } as any;
    await page.uploadImageForSubject(subject, { target });
    expect(mockMedia.uploadImage).toHaveBeenCalledWith(file);
    expect(subject.avatarURL).toBe('https://example.com/avatar.png');
    expect(target.value).toBe('');

    // Upload failure
    mockMedia.uploadImage.mockRejectedValueOnce(new Error('upload fail'));
    await page.uploadImageForSubject(subject, { target });
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should test helper methods: browseImagesForElementId, getTitle, and hasFieldAnError', () => {
    // browseImagesForElementId
    const clickSpy = vi.fn();
    const getElemSpy = vi.spyOn(document, 'getElementById').mockReturnValue({ click: clickSpy } as any);
    page.browseImagesForElementId('file-input');
    expect(clickSpy).toHaveBeenCalled();
    getElemSpy.mockRestore();

    // getTitle
    page.topic = new Topic({ type: TopicTypes.STANDARD });
    expect(page.getTitle()).toBe('Translated (translated)');

    delete (page.topic as any).type;
    expect(page.getTitle()).toBe('Translated');

    // hasFieldAnError
    page.errors = new Set(['name']);
    expect(page.hasFieldAnError('name')).toBe(true);
    expect(page.hasFieldAnError('category')).toBe(false);
  });

  it('should set UI helpers for complex fields with schedule and publish options', () => {
    page.topic = new Topic({
      publishedSince: '2099-01-01T00:00:00.000Z',
      willCloseAt: '2026-10-20T00:00:00.000Z',
      acceptAnswersUntil: '2026-10-21T00:00:00.000Z'
    });
    (page as any).setUIHelpersForComplexFields();
    expect(page.publishingOption).toBe(PublishingOptions.SCHEDULE);
    expect(page.hasDeadlineForQuestions).toBe(true);
    expect(page.hasDeadlineForAnswers).toBe(true);

    page.topic.publishedSince = '2020-01-01T00:00:00.000Z';
    (page as any).setUIHelpersForComplexFields();
    expect(page.publishingOption).toBe(PublishingOptions.PUBLISH);
  });
});
