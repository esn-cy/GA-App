import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveTopicPage } from '@tabs/topics/liveTopic.page';
import { Topic, TopicTypes } from '@models/topic.model';
import { Message, MessageTypes } from '@models/message.model';
import { Subject, SubjectTypes } from '@models/subject.model';
import { WebSocketConnectionTypes } from '@models/webSocket.model';

describe('LiveTopicPage', () => {
  let page: LiveTopicPage;
  let mockAlertCtrl: any;
  let mockActionsCtrl: any;
  let mockPopoverCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockWebSocket: any;
  let mockTopics: any;
  let mockAttachments: any;
  let mockMessages: any;
  let mockConfigurations: any;
  let mockApp: any;

  beforeEach(() => {
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
    };
    mockActionsCtrl = {
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
    mockWebSocket = {
      open: vi.fn(),
      close: vi.fn()
    };
    mockTopics = {
      getById: vi.fn().mockResolvedValue(new Topic({
        topicId: 'top-1',
        name: 'Live Plenary',
        type: TopicTypes.LIVE,
        mustBeSigned: false,
        isArchived: () => false,
        isClosed: () => false
      })),
      getRelated: vi.fn().mockResolvedValue([]),
      userMessagesUpvotesForTopic: vi.fn().mockResolvedValue({})
    };
    mockAttachments = {
      download: vi.fn().mockResolvedValue('https://download.url')
    };
    mockMessages = {
      getListOfTopic: vi.fn().mockResolvedValue([
        new Message({
          messageId: 'm-1',
          type: MessageTypes.QUESTION,
          summary: 'Question',
          creator: new Subject({
            id: 'u-creator',
            name: 'Creator',
            type: SubjectTypes.USER,
            section: 'S',
            country: 'C'
          })
        })
      ]),
      insert: vi.fn().mockResolvedValue(new Message({ messageId: 'm-new' })),
      insertAnonymous: vi.fn().mockResolvedValue(new Message({ messageId: 'm-anon' })),
      upvote: vi.fn().mockResolvedValue(undefined),
      upvoteCancel: vi.fn().mockResolvedValue(undefined),
      markComplete: vi.fn().mockResolvedValue(new Message({ messageId: 'm-1' })),
      undoComplete: vi.fn().mockResolvedValue(new Message({ messageId: 'm-1' })),
      delete: vi.fn().mockResolvedValue(undefined),
      getUpvoters: vi.fn().mockResolvedValue([]),
      webSocketAdd: vi.fn(),
      webSocketUpdate: vi.fn(),
      webSocketRemoveById: vi.fn()
    };
    mockConfigurations = {
      banUserByID: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      user: {
        userId: 'u-1',
        firstName: 'Live',
        lastName: 'Admin',
        email: 'admin@example.com',
        section: 'ESN Test',
        country: 'Testland',
        isAdministrator: true
      },
      isInMobileMode: vi.fn().mockReturnValue(false),
      goToInTabs: vi.fn(),
      openURL: vi.fn()
    };

    page = new LiveTopicPage(
      mockAlertCtrl,
      mockActionsCtrl,
      mockPopoverCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockWebSocket,
      mockTopics,
      mockAttachments,
      mockMessages,
      mockConfigurations,
      mockApp
    );
    page.topicId = 'top-1';
  });

  it('should initialize websocket on ngOnInit and close on ngOnDestroy', () => {
    let wsOptions: any;
    mockWebSocket.open.mockImplementationOnce((opts: any) => {
      wsOptions = opts;
    });

    page.ngOnInit();
    expect(mockWebSocket.open).toHaveBeenCalled();

    // Trigger websocket message callback
    wsOptions.onMessage({
      type: WebSocketConnectionTypes.MESSAGES,
      action: 'INSERT',
      item: { messageId: 'm-ws', type: MessageTypes.QUESTION }
    });
    expect(mockMessages.webSocketAdd).toHaveBeenCalled();

    wsOptions.onMessage({
      type: WebSocketConnectionTypes.MESSAGES,
      action: 'MODIFY',
      item: { messageId: 'm-ws', type: MessageTypes.APPRECIATION }
    });
    expect(mockMessages.webSocketUpdate).toHaveBeenCalled();

    wsOptions.onMessage({
      type: WebSocketConnectionTypes.MESSAGES,
      action: 'REMOVE',
      item: { messageId: 'm-ws', type: MessageTypes.QUESTION }
    });
    expect(mockMessages.webSocketRemoveById).toHaveBeenCalledWith('m-ws');

    // Non-MESSAGES type triggers handleRefresh
    const spyRefresh = vi.spyOn(page, 'handleRefresh').mockResolvedValue(undefined);
    wsOptions.onMessage({
      type: 'OTHER',
      action: 'INSERT',
      item: {}
    });
    expect(spyRefresh).toHaveBeenCalled();

    page.ngOnDestroy();
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should load topic and messages on ionViewWillEnter and handle error', async () => {
    await page.ionViewWillEnter();
    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockTopics.getById).toHaveBeenCalledWith('top-1');
    expect(page.topic?.name).toBe('Live Plenary');
    expect(mockLoading.hide).toHaveBeenCalled();

    mockTopics.getById.mockRejectedValueOnce(new Error('fail'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should handle refresher on handleRefresh', async () => {
    const refresher = { complete: vi.fn().mockResolvedValue(undefined) } as any;
    await page.handleRefresh(refresher);
    expect(page.topic).toBeDefined();
    expect(refresher.complete).toHaveBeenCalled();
  });

  it('should manage topic and download attachment', async () => {
    await page.ionViewWillEnter();
    page.manageTopic();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-1', 'manage']);

    await page.downloadAttachment({ filename: 'test.pdf' } as any);
    expect(mockAttachments.download).toHaveBeenCalled();
    expect(mockApp.openURL).toHaveBeenCalledWith('https://download.url');

    mockAttachments.download.mockRejectedValueOnce(new Error('fail'));
    await page.downloadAttachment({ filename: 'test.pdf' } as any);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should create and toggle new message anonymously', async () => {
    await page.ionViewWillEnter();
    page.startNewMessage(false);
    expect(page.newMessage?.type).toBe(MessageTypes.QUESTION);
    expect(page.newMessage?.creator).toBeDefined();

    page.handleMessageMarkedAnonymous(true);
    expect(page.newMessage?.creator).toBeUndefined();

    page.handleMessageMarkedAnonymous(false);
    expect(page.newMessage?.creator).toBeDefined();
  });

  it('should cancel new message with and without confirmation', async () => {
    await page.ionViewWillEnter();
    page.startNewMessage();

    // Empty message cancels immediately
    await page.cancelNewMessage();
    expect(page.newMessage).toBeUndefined();

    // With summary prompts confirmation
    page.startNewMessage();
    page.newMessage!.summary = 'Draft summary';
    let doCancel: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doCancel = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.cancelNewMessage();
    expect(doCancel).toBeDefined();
    doCancel();
    expect(page.newMessage).toBeUndefined();
  });

  it('should filter questions and appreciations with pagination scroll', async () => {
    vi.useFakeTimers();
    await page.ionViewWillEnter();

    const mockInfiniteScroll = {
      complete: vi.fn().mockResolvedValue(undefined)
    } as any;

    page.questions = [new Message({ messageId: 'q-last' })];
    await page.filterQuestions(mockInfiniteScroll, true);
    expect(mockMessages.getListOfTopic).toHaveBeenCalledWith(
      page.topic,
      expect.objectContaining({ startPaginationAfterId: 'q-last' })
    );
    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalled();

    page.appreciations = [new Message({ messageId: 'a-last' })];
    await page.filterAppreciations(mockInfiniteScroll, true);
    expect(mockMessages.getListOfTopic).toHaveBeenCalledWith(
      page.topic,
      expect.objectContaining({ startPaginationAfterId: 'a-last' })
    );
    vi.advanceTimersByTime(150);
    expect(mockInfiniteScroll.complete).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should handle cancelNewMessage when newMessage is undefined', async () => {
    page.newMessage = undefined;
    await page.cancelNewMessage();
    expect(page.newMessage).toBeUndefined();
  });

  it('should validate and send new message (named and anonymous) and handle send failure', async () => {
    // When newMessage is undefined
    page.newMessage = undefined;
    await page.sendNewMessage();

    await page.ionViewWillEnter();
    page.startNewMessage();

    // Invalid message
    await page.sendNewMessage();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid named message
    page.newMessage!.summary = 'Valid summary for question';
    page.newMessage!.text = 'Valid text';
    let doSend: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.sendNewMessage();
    await doSend();
    expect(mockMessages.insert).toHaveBeenCalled();

    // Valid anonymous message
    page.startNewMessage();
    page.newMessage!.summary = 'Anonymous summary';
    page.handleMessageMarkedAnonymous(true);
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.sendNewMessage();
    await doSend();
    expect(mockMessages.insertAnonymous).toHaveBeenCalled();

    // Send failure
    page.startNewMessage();
    page.newMessage!.summary = 'Fail summary';
    page.newMessage!.text = 'Fail text';
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockMessages.insert.mockRejectedValueOnce(new Error('fail'));
    await page.sendNewMessage();
    await doSend();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should check hasFieldAnError', () => {
    page.errors = new Set(['summary']);
    expect(page.hasFieldAnError('summary')).toBe(true);
    expect(page.hasFieldAnError('text')).toBe(false);
  });

  it('should upvote and un-upvote message with error handling and handle undefined topic', async () => {
    page.topic = undefined;
    const msg = new Message({ messageId: 'm-1', numOfUpvotes: 1 });
    await page.upvoteMessage(msg, true);
    expect(mockMessages.upvote).not.toHaveBeenCalled();

    await page.ionViewWillEnter();

    await page.upvoteMessage(msg, true);
    expect(mockMessages.upvote).toHaveBeenCalled();
    expect(msg.numOfUpvotes).toBe(2);

    await page.upvoteMessage(msg, false);
    expect(mockMessages.upvoteCancel).toHaveBeenCalled();
    expect(msg.numOfUpvotes).toBe(1);

    mockMessages.upvote.mockRejectedValueOnce(new Error('fail'));
    await page.upvoteMessage(msg, true);
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should handle seeMessageUpvoters when topic is undefined, with event, and with appreciation type', async () => {
    page.topic = undefined;
    const msg = new Message({ messageId: 'm-1', type: MessageTypes.QUESTION });
    const mockEv = { stopPropagation: vi.fn() } as any;
    await page.seeMessageUpvoters(msg, mockEv);
    expect(mockEv.stopPropagation).not.toHaveBeenCalled();
    expect(mockPopoverCtrl.create).not.toHaveBeenCalled();

    await page.ionViewWillEnter();
    const appMsg = new Message({ messageId: 'm-app', type: MessageTypes.APPRECIATION });
    await page.seeMessageUpvoters(appMsg, mockEv);
    expect(mockEv.stopPropagation).toHaveBeenCalled();
    expect(mockPopoverCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        componentProps: expect.objectContaining({ reaction: 'appreciation' }),
        event: mockEv
      })
    );
  });

  it('should execute actions on message and handle edge cases and failures', async () => {
    // Falsy message returns immediately
    await page.actionsOnMessage(undefined as any);

    await page.ionViewWillEnter();
    const msg = new Message({
      messageId: 'm-1',
      type: MessageTypes.QUESTION,
      summary: 'Q1',
      text: 'Long content',
      creator: new Subject({ id: 'u-1', name: 'User 1', type: SubjectTypes.USER, section: 'S', country: 'C' })
    });

    let buttons: any[] = [];
    mockActionsCtrl.create.mockImplementationOnce(async (opts: any) => {
      buttons = opts.buttons;
      return { present: vi.fn() };
    });

    await page.actionsOnMessage(msg);
    expect(buttons.length).toBeGreaterThan(0);

    // Mark complete
    const markCompleteBtn = buttons.find((b) => b.icon === 'checkmark-done' || b.text === 'MESSAGES.MARK_COMPLETE');
    await markCompleteBtn?.handler();
    expect(mockMessages.markComplete).toHaveBeenCalled();

    // Read full text
    const readFullBtn = buttons.find((b) => b.icon === 'document-text' || b.text === 'MESSAGES.READ_FULL_TEXT');
    await readFullBtn?.handler();
    expect(mockAlertCtrl.create).toHaveBeenCalled();

    // See who reacted
    const reactedBtn = buttons.find((b) => b.icon === 'eye' || b.text === 'MESSAGES.SEE_WHO_REACTED');
    await reactedBtn?.handler();
    expect(mockPopoverCtrl.create).toHaveBeenCalled();

    // Open profile
    const profileBtn = buttons.find((b) => b.icon === 'person' || b.text === 'MESSAGES.OPEN_PROFILE');
    profileBtn?.handler();
    expect(mockApp.openURL).toHaveBeenCalled();

    // Delete message
    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    const deleteBtn = buttons.find((b) => b.icon === 'trash' || b.text === 'MESSAGES.DELETE');
    await deleteBtn?.handler();
    await doDelete();
    expect(mockMessages.delete).toHaveBeenCalled();

    // Delete and ban user
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    const deleteBanBtn = buttons.find((b) => b.icon === 'ban' || b.text === 'MESSAGES.DELETE_AND_BAN_USER');
    await deleteBanBtn?.handler();
    await doDelete();
    expect(mockConfigurations.banUserByID).toHaveBeenCalledWith('u-1');

    // Completed message with undoComplete and appreciation
    const compMsg = new Message({
      messageId: 'm-2',
      type: MessageTypes.APPRECIATION,
      completedAt: new Date().toISOString(),
      creator: new Subject({ id: 'u-1', name: 'User 1', type: SubjectTypes.USER, section: 'S', country: 'C' })
    });
    mockActionsCtrl.create.mockImplementationOnce(async (opts: any) => {
      buttons = opts.buttons;
      return { present: vi.fn() };
    });
    await page.actionsOnMessage(compMsg);
    const undoBtn = buttons.find((b) => b.icon === 'square-outline' || b.text === 'MESSAGES.UNDO_COMPLETE');
    await undoBtn?.handler();
    expect(mockMessages.undoComplete).toHaveBeenCalled();

    // Undo complete error handling
    mockMessages.undoComplete.mockRejectedValueOnce(new Error('fail'));
    await undoBtn?.handler();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // Delete message error handling
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockMessages.delete.mockRejectedValueOnce(new Error('fail'));
    await deleteBtn?.handler();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // Delete and ban error handling
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockConfigurations.banUserByID.mockRejectedValueOnce(new Error('fail'));
    await deleteBanBtn?.handler();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // Message without creator
    const anonMsg = new Message({ messageId: 'm-anon', type: MessageTypes.QUESTION });
    mockActionsCtrl.create.mockImplementationOnce(async (opts: any) => {
      buttons = opts.buttons;
      return { present: vi.fn() };
    });
    await page.actionsOnMessage(anonMsg);
    expect(buttons.find((b) => b.icon === 'person')).toBeUndefined();
    expect(buttons.find((b) => b.icon === 'trash')).toBeUndefined();

    // Non-admin user with closed topic
    mockApp.user.isAdministrator = false;
    mockApp.user.userId = 'other-user';
    page.topic!.isClosed = () => true;
    mockActionsCtrl.create.mockImplementationOnce(async (opts: any) => {
      buttons = opts.buttons;
      return { present: vi.fn() };
    });
    await page.actionsOnMessage(compMsg);
    expect(buttons.find((b) => b.icon === 'trash')).toBeUndefined();
    expect(buttons.find((b) => b.icon === 'square-outline')).toBeUndefined();
  });

  it('should toggle full screen and trackBy', () => {
    page.enterFullScreen();
    expect(page.fullScreen).toBe(true);

    page.exitFullScreen();
    expect(page.fullScreen).toBe(false);

    expect(page.trackBy(0, { messageId: 'm-track' } as any)).toBe('m-track');

    page.openTopic(new Topic({ topicId: 'top-live', type: TopicTypes.LIVE }));
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-live', 'live']);

    page.openTopic(new Topic({ topicId: 'top-std', type: TopicTypes.STANDARD }));
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-std', 'standard']);
  });

  it('should generate QR code canvas by URL handling missing container, success, and error', async () => {
    // Missing container
    await (page as any).generateQRCodeCanvasByURL('https://example.com/topic');

    // Container exists with error
    const container = document.createElement('div');
    container.id = 'qrCodeContainer';
    document.body.appendChild(container);

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
      throw new Error('context error');
    }) as any;

    await expect((page as any).generateQRCodeCanvasByURL('https://example.com/topic')).rejects.toThrow('context error');

    // Container exists with success
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      createImageData: vi.fn((w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })),
      putImageData: vi.fn()
    }) as any;

    await (page as any).generateQRCodeCanvasByURL('https://example.com/topic');
    expect(container.children.length).toBe(1);
    const canvas = container.children[0] as HTMLCanvasElement;
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
    expect(canvas.style.borderRadius).toBe('4px');

    HTMLCanvasElement.prototype.getContext = originalGetContext;
    document.body.removeChild(container);
  });
});
