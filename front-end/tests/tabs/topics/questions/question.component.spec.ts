import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionComponent } from '@tabs/topics/questions/question.component';
import { Topic, TopicTypes } from '@models/topic.model';
import { Question } from '@models/question.model';
import { Answer } from '@models/answer.model';
import { UserDraft } from '@models/userDraft.model';
import { Subject, SubjectTypes } from '@models/subject.model';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let mockAlertCtrl: any;
  let mockPopoverCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockQuestions: any;
  let mockAnswers: any;
  let mockDrafts: any;
  let mockApp: any;

  const ISO_DRAFT_ID = '2025-01-01T00:00:00.000Z';

  beforeEach(() => {
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
    };
    mockPopoverCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined)
      })
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
      _: vi.fn().mockImplementation((k: string) => k)
    };
    mockQuestions = {
      userHasUpvoted: vi.fn().mockResolvedValue(false),
      userClaps: vi.fn().mockResolvedValue({}),
      upvote: vi.fn().mockResolvedValue(undefined),
      upvoteCancel: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getUpvoters: vi.fn().mockResolvedValue([])
    };
    mockAnswers = {
      getListOfQuestion: vi.fn().mockResolvedValue([
        new Answer({ answerId: 'ans-1', text: 'Answer text' })
      ]),
      insert: vi.fn().mockResolvedValue(new Answer({ answerId: 'ans-new', text: 'New answer' })),
      clap: vi.fn().mockResolvedValue(undefined),
      clapCancel: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getClappers: vi.fn().mockResolvedValue([])
    };
    mockDrafts = {
      getAnswerOfQuestion: vi.fn().mockResolvedValue(new UserDraft({ draftId: ISO_DRAFT_ID, text: 'Draft answer' })),
      insert: vi.fn().mockResolvedValue(new UserDraft({ draftId: ISO_DRAFT_ID, text: 'Draft answer' })),
      update: vi.fn().mockResolvedValue(new UserDraft({ draftId: ISO_DRAFT_ID, text: 'Draft answer' })),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      user: {
        userId: 'u-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        section: 'ESN Test',
        country: 'Testland'
      }
    };

    component = new QuestionComponent(
      mockAlertCtrl,
      mockPopoverCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockQuestions,
      mockAnswers,
      mockDrafts,
      mockApp
    );
    component.topic = new Topic({ topicId: 'top-1', type: TopicTypes.STANDARD });
    component.question = new Question({ questionId: 'q-1', topicId: 'top-1', summary: 'Question 1', numOfUpvotes: 2 });
  });

  it('should load answers, upvotes, claps, and draft on ngOnChanges', async () => {
    await component.ngOnChanges({
      question: {
        currentValue: component.question,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(mockAnswers.getListOfQuestion).toHaveBeenCalled();
    expect(mockQuestions.userHasUpvoted).toHaveBeenCalled();
    expect(mockQuestions.userClaps).toHaveBeenCalled();
    expect(mockDrafts.getAnswerOfQuestion).toHaveBeenCalled();
    expect(component.answers?.length).toBe(1);
    expect(component.fromDraft?.draftId).toBe(ISO_DRAFT_ID);
  });

  it('should upvote and un-upvote question with error handling', async () => {
    await component.upvoteQuestion(true);
    expect(mockQuestions.upvote).toHaveBeenCalledWith(component.topic, component.question);
    expect(component.question.numOfUpvotes).toBe(3);

    await component.upvoteQuestion(false);
    expect(mockQuestions.upvoteCancel).toHaveBeenCalledWith(component.topic, component.question);
    expect(component.question.numOfUpvotes).toBe(2);

    mockQuestions.upvote.mockRejectedValueOnce(new Error('fail'));
    await component.upvoteQuestion(true);
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should clap and un-clap answer with error handling', async () => {
    const ans = new Answer({ answerId: 'ans-1' });
    await component.clapAnswer(true, ans);
    expect(mockAnswers.clap).toHaveBeenCalledWith(component.question, ans);
    expect(component.userClapped['ans-1']).toBe(true);

    await component.clapAnswer(false, ans);
    expect(mockAnswers.clapCancel).toHaveBeenCalledWith(component.question, ans);
    expect(component.userClapped['ans-1']).toBe(false);

    mockAnswers.clap.mockRejectedValueOnce(new Error('fail'));
    await component.clapAnswer(true, ans);
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should write answer, prepopulate from draft, and cancel', async () => {
    component.fromDraft = new UserDraft({ draftId: ISO_DRAFT_ID, text: 'Prepopulated' });
    component.writeAnswer();
    expect(component.newAnswer?.text).toBe('Prepopulated');

    // Cancel without text cancels directly
    component.newAnswer!.text = '';
    await component.cancelNewAnswer();
    expect(component.newAnswer).toBeUndefined();

    // Cancel with text prompts alert
    component.writeAnswer();
    component.newAnswer!.text = 'Some answer';
    let doCancel: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doCancel = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.cancelNewAnswer();
    expect(doCancel).toBeDefined();
    doCancel();
    expect(component.newAnswer).toBeUndefined();
  });

  it('should validate and send new answer and delete draft', async () => {
    component.writeAnswer();

    // Invalid answer
    await component.sendNewAnswer();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid answer
    component.newAnswer!.text = 'Valid answer content';
    component.fromDraft = new UserDraft({ draftId: ISO_DRAFT_ID });
    component.answers = [];

    let doSend: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await component.sendNewAnswer();
    expect(doSend).toBeDefined();
    await doSend();
    expect(mockAnswers.insert).toHaveBeenCalled();
    expect(mockDrafts.delete).toHaveBeenCalled();
    expect(component.answers.length).toBe(1);
    expect(component.newAnswer).toBeUndefined();

    // Send answer error
    component.writeAnswer();
    component.newAnswer!.text = 'Valid answer content';
    mockAnswers.insert.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.sendNewAnswer();
    await doSend();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should validate and save answer as draft', async () => {
    component.newAnswer = new Answer({
      text: 'Draft answer text',
      creator: new Subject({ id: 'u-1', name: 'John Doe', type: SubjectTypes.USER, section: 'S', country: 'C' })
    });
    await component.saveNewAnswerAsDraft();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockDrafts.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(component.newAnswer).toBeUndefined();
    expect(mockLoading.hide).toHaveBeenCalled();

    // Update existing draft
    component.newAnswer = new Answer({
      text: 'Draft answer 2',
      creator: new Subject({ id: 'u-1', name: 'John Doe', type: SubjectTypes.USER, section: 'S', country: 'C' })
    });
    component.fromDraft = new UserDraft({ draftId: ISO_DRAFT_ID });
    await component.saveNewAnswerAsDraft();
    expect(mockDrafts.update).toHaveBeenCalled();

    // Draft save error
    component.newAnswer = new Answer({
      text: 'Draft answer 3',
      creator: new Subject({ id: 'u-1', name: 'John Doe', type: SubjectTypes.USER, section: 'S', country: 'C' })
    });
    component.fromDraft = undefined;
    mockDrafts.insert.mockRejectedValueOnce(new Error('fail'));
    await component.saveNewAnswerAsDraft();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should trigger alert and execute doDelete on deleteQuestion and deleteDraft', async () => {
    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.deleteQuestion();
    expect(doDelete).toBeDefined();
    await doDelete();
    expect(mockQuestions.delete).toHaveBeenCalled();

    // Delete question error
    mockQuestions.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.deleteQuestion();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    component.fromDraft = new UserDraft({ draftId: ISO_DRAFT_ID });
    await component.deleteDraft();
    expect(doDelete).toBeDefined();
    await doDelete();
    expect(mockDrafts.delete).toHaveBeenCalled();
    expect(component.fromDraft).toBeUndefined();

    // Delete draft error
    component.fromDraft = new UserDraft({ draftId: ISO_DRAFT_ID });
    mockDrafts.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.deleteDraft();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should delete last answer with confirmation', async () => {
    const ans1 = new Answer({ answerId: 'ans-1', text: 'Ans 1' });
    component.answers = [ans1];

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await component.deleteLastAnswer();
    expect(doDelete).toBeDefined();
    await doDelete();
    expect(mockAnswers.delete).toHaveBeenCalled();
    expect(component.answers).toHaveLength(0);

    // Delete last answer error
    component.answers = [ans1];
    mockAnswers.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.deleteLastAnswer();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // When no answers exist
    await component.deleteLastAnswer();
  });

  it('should open popover for upvoters and clappers', async () => {
    const mockEvent = { stopPropagation: vi.fn() } as any;
    await component.seeQuestionUpvoters(mockEvent);
    expect(mockPopoverCtrl.create).toHaveBeenCalled();

    const ans = new Answer({ answerId: 'ans-1' });
    await component.seeAnswerClappers(ans, mockEvent);
    expect(mockPopoverCtrl.create).toHaveBeenCalled();

    component.errors.add('text');
    expect(component.hasFieldAnError('text')).toBe(true);
    expect(component.hasFieldAnError('other')).toBe(false);
  });
});
