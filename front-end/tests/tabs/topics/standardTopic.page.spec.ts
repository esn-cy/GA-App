import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StandardTopicPage } from '@tabs/topics/standardTopic.page';
import { TopicsService } from '@tabs/topics/topics.service';
import { PublicAttachmentsService } from '@common/attachments.service';
import { QuestionsService } from '@tabs/topics/questions/questions.service';
import { UserDraftsService } from '@tabs/topics/drafts/drafts.service';
import { AppService } from '@app/app.service';
import { AlertController, IonContent } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';
import { Topic, TopicTypes } from '@models/topic.model';
import { Question } from '@models/question.model';
import { UserDraft } from '@models/userDraft.model';

describe('StandardTopicPage', () => {
  let page: StandardTopicPage;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockTopicsService: any;
  let mockAttachmentsService: any;
  let mockQuestionsService: any;
  let mockDraftsService: any;
  let mockApp: any;

  const mockTopic: Topic = new Topic({
    topicId: 'topic-123',
    name: 'Board Candidate Q&A',
    type: TopicTypes.STANDARD
  });

  const mockQuestions: Question[] = [
    new Question({ questionId: 'q-1', summary: 'Question 1', topicId: 'topic-123' }),
    new Question({ questionId: 'q-2', summary: 'Question 2', topicId: 'topic-123' })
  ];

  beforeEach(() => {
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => {
        return {
          present: vi.fn().mockResolvedValue(undefined),
          opts
        };
      })
    };
    mockLoading = { show: vi.fn(), hide: vi.fn() };
    mockMessage = { error: vi.fn(), success: vi.fn() };
    mockTranslations = { _: vi.fn().mockImplementation((k: string) => k) };
    mockTopicsService = {
      getById: vi.fn().mockResolvedValue(mockTopic),
      getRelated: vi.fn().mockResolvedValue([])
    };
    mockAttachmentsService = {
      download: vi.fn().mockResolvedValue('https://example.com/file.pdf')
    };
    mockQuestionsService = {
      getListOfTopic: vi.fn().mockResolvedValue(mockQuestions),
      insert: vi.fn().mockResolvedValue(new Question({ questionId: 'q-new' }))
    };
    mockDraftsService = {
      getQuestionsOfTopic: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockResolvedValue(new UserDraft({ draftId: '2025-01-01T00:00:00.000Z', text: 'd' })),
      update: vi.fn().mockResolvedValue(new UserDraft({ draftId: '2025-01-01T00:00:00.000Z', text: 'd' })),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      goToInTabs: vi.fn(),
      openURL: vi.fn(),
      user: {
        userId: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        section: 'ESN Test',
        country: 'Testland'
      }
    };

    page = new StandardTopicPage(
      mockAlertCtrl as AlertController,
      mockLoading as IDEALoadingService,
      mockMessage as IDEAMessageService,
      mockTranslations as IDEATranslationsService,
      mockTopicsService as TopicsService,
      mockAttachmentsService as PublicAttachmentsService,
      mockQuestionsService as QuestionsService,
      mockDraftsService as UserDraftsService,
      mockApp as AppService
    );
    page.topicId = 'topic-123';
    page.content = { scrollToTop: vi.fn(), scrollToPoint: vi.fn() } as unknown as IonContent;
  });

  it('should load topic and questions on ionViewWillEnter', async () => {
    await page.ionViewWillEnter();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockTopicsService.getById).toHaveBeenCalledWith('topic-123');
    expect(mockQuestionsService.getListOfTopic).toHaveBeenCalled();
    expect(page.topic).toEqual(mockTopic);
    expect(page.questions).toEqual(mockQuestions);
    expect(mockLoading.hide).toHaveBeenCalled();

    mockTopicsService.getById.mockRejectedValueOnce(new Error('fail'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.NOT_FOUND');
  });

  it('should handle refresh', async () => {
    await page.ionViewWillEnter();
    const mockRefresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(mockRefresher);
    expect(mockRefresher.complete).toHaveBeenCalled();
  });

  it('should select and deselect questions', () => {
    const q = mockQuestions[0];
    page.selectQuestion(q);
    expect(page.currentQuestion).toBe(q);
    expect(page.content.scrollToTop).toHaveBeenCalledWith(500);

    page.selectQuestion(undefined);
    expect(page.currentQuestion).toBeUndefined();
  });

  it('should remove current question from list and refilter', async () => {
    await page.ionViewWillEnter();
    page.selectQuestion(mockQuestions[0]);
    await page.removeCurrentQuestionFromList();
    expect(page.currentQuestion).toBeUndefined();
    expect(mockQuestionsService.getListOfTopic).toHaveBeenCalled();
  });

  it('should navigate to manage topic', () => {
    page.topic = mockTopic;
    page.manageTopic();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'topic-123', 'manage']);
  });

  it('should download attachment', async () => {
    const attachment = { filename: 'test.pdf' } as any;
    await page.downloadAttachment(attachment);
    expect(mockAttachmentsService.download).toHaveBeenCalledWith(attachment);
    expect(mockApp.openURL).toHaveBeenCalledWith('https://example.com/file.pdf');

    mockAttachmentsService.download.mockRejectedValueOnce(new Error('fail'));
    await page.downloadAttachment(attachment);
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should filter questions with and without infinite scroll', async () => {
    page.topic = mockTopic;
    await page.filterQuestions('search text');
    expect(mockQuestionsService.getListOfTopic).toHaveBeenCalledWith(mockTopic, expect.objectContaining({ search: 'search text' }));

    vi.useFakeTimers();
    const scroll = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    page.questions = mockQuestions;
    await page.filterQuestions('', scroll);
    vi.advanceTimersByTime(150);
    expect(scroll.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should start and cancel new question with scroll timeout', async () => {
    page.topic = mockTopic;

    const div = document.createElement('div');
    div.id = 'newQuestion';
    div.getBoundingClientRect = vi.fn().mockReturnValue({ top: 300 } as any);
    document.body.appendChild(div);

    vi.useFakeTimers();
    page.startNewQuestion();
    vi.advanceTimersByTime(150);
    expect(page.content.scrollToPoint).toHaveBeenCalled();
    vi.useRealTimers();
    document.body.removeChild(div);

    expect(page.newQuestion).toBeDefined();
    expect(page.newQuestion?.creator).toBeDefined();

    const draft = new UserDraft({ draftId: '2025-01-01T00:00:00.000Z', summary: 'Draft S', text: 'Draft T' });
    page.startNewQuestion(draft);
    expect(page.newQuestion?.summary).toBe('Draft S');

    // Cancel without text -> cancels immediately
    page.newQuestion!.summary = '';
    page.newQuestion!.text = '';
    await page.cancelNewQuestion();
    expect(page.newQuestion).toBeUndefined();

    // Cancel with text -> shows confirmation alert
    page.startNewQuestion();
    page.newQuestion!.summary = 'Something';
    await page.cancelNewQuestion();
    expect(mockAlertCtrl.create).toHaveBeenCalled();
  });

  it('should validate, send new question and delete draft with error handling', async () => {
    page.topic = mockTopic;
    page.startNewQuestion();

    // Empty validation error
    await page.sendNewQuestion();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid question
    page.newQuestion!.summary = 'Valid question summary';
    page.newQuestion!.text = 'Valid question full content';
    page.fromDraft = new UserDraft({ draftId: '2025-01-01T00:00:00.000Z' });
    page.drafts = [page.fromDraft];

    let confirmHandler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      confirmHandler = opts.buttons.find((b: any) => b.handler)?.handler;
      return { present: vi.fn().mockResolvedValue(undefined) };
    });

    await page.sendNewQuestion();
    expect(confirmHandler).toBeDefined();

    await confirmHandler();
    expect(mockQuestionsService.insert).toHaveBeenCalled();
    expect(mockDraftsService.delete).toHaveBeenCalled();
    expect(page.newQuestion).toBeUndefined();

    // Send error
    mockQuestionsService.insert.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      confirmHandler = opts.buttons.find((b: any) => b.handler)?.handler;
      return { present: vi.fn().mockResolvedValue(undefined) };
    });
    page.startNewQuestion();
    page.newQuestion!.summary = 'Valid summary';
    page.newQuestion!.text = 'Valid text';
    await page.sendNewQuestion();
    await confirmHandler();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should save new question as draft with error handling', async () => {
    page.topic = mockTopic;
    page.startNewQuestion();

    // Empty validation error
    await page.saveNewQuestionAsDraft();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid draft insert
    page.newQuestion!.summary = 'Valid draft summary';
    page.newQuestion!.text = 'Valid draft text';
    page.drafts = [];
    await page.saveNewQuestionAsDraft();
    expect(mockDraftsService.insert).toHaveBeenCalled();
    expect(page.drafts.length).toBe(1);

    // Valid draft update
    page.startNewQuestion();
    page.newQuestion!.summary = 'Valid draft 2';
    page.newQuestion!.text = 'Valid text 2';
    page.fromDraft = new UserDraft({ draftId: '2025-01-01T00:00:00.000Z' });
    await page.saveNewQuestionAsDraft();
    expect(mockDraftsService.update).toHaveBeenCalled();

    // Draft insert error
    page.startNewQuestion();
    page.newQuestion!.summary = 'Valid draft 3';
    page.newQuestion!.text = 'Valid text 3';
    mockDraftsService.insert.mockRejectedValueOnce(new Error('fail'));
    await page.saveNewQuestionAsDraft();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should delete draft with alert confirmation and error handling', async () => {
    const draft = new UserDraft({ draftId: '2025-01-01T00:00:00.000Z' });
    page.drafts = [draft];

    let deleteHandler: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      deleteHandler = opts.buttons.find((b: any) => b.handler)?.handler;
      return { present: vi.fn().mockResolvedValue(undefined) };
    });

    await page.deleteDraft(draft);
    expect(deleteHandler).toBeDefined();

    await deleteHandler();
    expect(mockDraftsService.delete).toHaveBeenCalledWith(draft);
    expect(page.drafts).toHaveLength(0);

    // Delete error
    const draft2 = new UserDraft({ draftId: '2025-01-02T00:00:00.000Z' });
    mockDraftsService.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      deleteHandler = opts.buttons.find((b: any) => b.handler)?.handler;
      return { present: vi.fn().mockResolvedValue(undefined) };
    });
    await page.deleteDraft(draft2);
    await deleteHandler();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should open topic and check past date', () => {
    const liveTopic = new Topic({ topicId: 'top-live', type: TopicTypes.LIVE });
    page.openTopic(liveTopic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-live', 'live']);

    const stdTopic = new Topic({ topicId: 'top-std', type: TopicTypes.STANDARD });
    page.openTopic(stdTopic);
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-std', 'standard']);

    expect(page.isPast('2000-01-01T00:00:00.000Z')).toBe(true);
    expect(page.isPast('2099-01-01T00:00:00.000Z')).toBe(false);

    page.errors.add('summary');
    expect(page.hasFieldAnError('summary')).toBe(true);
    expect(page.hasFieldAnError('other')).toBe(false);
  });
});
