import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageVotingSessionPage } from '@tabs/voting/manageSession.page';
import { Voter, VotingBallot, VotingSession, VotingSessionTypes } from '@models/votingSession.model';
import { VotingTicket } from '@models/votingTicket.model';

enum UXMode { VIEW, INSERT, EDIT }

enum PublishingOptions { DRAFT = 'DRAFT', SCHEDULE = 'SCHEDULE', PUBLISH = 'PUBLISH' }

enum PageSections {
  GENERAL = 'GENERAL',
  START = 'START',
  BALLOTS = 'BALLOTS',
  VOTERS = 'VOTERS',
  IMMEDIATE = 'IMMEDIATE',
  ROLL_CALL = 'ROLL_CALL',
  ANALYTICS = 'ANALYTICS'
}

describe('ManageVotingSessionPage', () => {
  let page: ManageVotingSessionPage;
  let mockLocation: any;
  let mockAlertCtrl: any;
  let mockModalCtrl: any;
  let mockActionsCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockWebSocket: any;
  let mockVoting: any;
  let mockApp: any;

  beforeEach(() => {
    mockLocation = {
      path: vi.fn().mockReturnValue('/voting/FORM_PUBLIC/manage'),
      replaceState: vi.fn()
    };
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
    };
    mockModalCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: { text: 'New Ballot' } }),
        opts
      }))
    };
    mockActionsCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined),
      warning: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockImplementation((k: string) => k)
    };
    mockWebSocket = {
      open: vi.fn(),
      close: vi.fn(),
      isOpen: vi.fn().mockReturnValue(false)
    };
    mockVoting = {
      getById: vi.fn().mockResolvedValue(new VotingSession({
        sessionId: 's-1',
        name: 'Session 1',
        type: VotingSessionTypes.FORM_PUBLIC,
        voters: [{ id: 'v-1', name: 'Alice', email: 'alice@example.com' }],
        ballots: [new VotingBallot({ text: 'Ballot 1', options: ['A', 'B'] })]
      })),
      insert: vi.fn().mockResolvedValue(new VotingSession({ sessionId: 's-new', name: 'New Session' })),
      update: vi.fn().mockResolvedValue(new VotingSession({ sessionId: 's-1', name: 'Updated Session' })),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getVotingTicketsStatus: vi.fn().mockResolvedValue([]),
      start: vi.fn().mockImplementation(async (s) => s),
      extendDuration: vi.fn().mockImplementation(async (s) => s),
      stopPrematurely: vi.fn().mockImplementation(async (s) => s),
      getVotesBeforeTheyArePublished: vi.fn().mockResolvedValue([[{ value: 1, voters: ['Alice'] }]]),
      publishVotingFormResults: vi.fn().mockImplementation(async (s) => s),
      downloadResultsSpreadsheet: vi.fn(),
      downloadVotersSpreadsheet: vi.fn(),
      downloadVotersAuditSpreadsheet: vi.fn(),
      setImmediateResults: vi.fn().mockImplementation(async (s) => s),
      checkWhetherSessionShouldEndEarly: vi.fn().mockImplementation(async (s) => s)
    };
    mockApp = {
      user: { userId: 'u-1', isAdministrator: true },
      closePage: vi.fn(),
      goToInTabs: vi.fn()
    };

    page = new ManageVotingSessionPage(
      mockLocation,
      mockAlertCtrl,
      mockModalCtrl,
      mockActionsCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockWebSocket,
      mockVoting,
      mockApp
    );
  });

  it('should initialize existing session in VIEW mode', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockVoting.getById).toHaveBeenCalledWith('s-1');
    expect(page.votingSession.name).toBe('Session 1');
    expect(page.editMode).toBe(UXMode.VIEW);
    expect(mockLoading.hide).toHaveBeenCalled();

    mockVoting.getById.mockRejectedValueOnce(new Error('fail'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should initialize existing session when started and in progress', async () => {
    page.sessionId = 's-1' as any;
    const startedSession = new VotingSession({
      sessionId: 's-1',
      name: 'Started Session',
      startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2099-01-01T00:00:00.000Z',
      administratorsIds: ['u-admin']
    });
    mockVoting.getById.mockResolvedValueOnce(startedSession);
    mockVoting.getVotingTicketsStatus.mockResolvedValueOnce([]);
    const checkSpy = vi.spyOn(page as any, 'checkWhetherSessionShouldEndEarly').mockResolvedValue(undefined);
    const wsSpy = vi.spyOn(page as any, 'openWebSocketForVotingTicketsStatus').mockImplementation(() => {
    });

    await page.ionViewWillEnter();
    expect(mockVoting.getVotingTicketsStatus).toHaveBeenCalledWith(startedSession);
    expect(checkSpy).toHaveBeenCalled();
    expect(wsSpy).toHaveBeenCalled();
  });

  it('should initialize new session in INSERT mode', async () => {
    page.sessionId = 'FORM_PUBLIC' as any;
    await page.ionViewWillEnter();

    expect(page.votingSession).toBeDefined();
    expect(page.editMode).toBe(UXMode.INSERT);
  });

  it('should block non-administrator for new session', async () => {
    mockApp.user.isAdministrator = false;
    page.sessionId = 'FORM_PUBLIC' as any;
    await page.ionViewWillEnter();
    expect(mockApp.closePage).toHaveBeenCalledWith('COMMON.UNAUTHORIZED');
  });

  it('should close websocket on ngOnDestroy', () => {
    page.ngOnDestroy();
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should validate and insert session on save', async () => {
    page.sessionId = 'FORM_PUBLIC' as any;
    await page.ionViewWillEnter();

    // Validation failure
    page.votingSession.name = '';
    await page.save();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid insertion
    page.votingSession.name = 'Valid Session';
    page.votingSession.type = VotingSessionTypes.FORM_PUBLIC;

    await page.save();
    expect(mockVoting.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(page.editMode).toBe(UXMode.VIEW);

    // Update in edit mode
    page.editMode = UXMode.EDIT;
    await page.save();
    expect(mockVoting.update).toHaveBeenCalled();

    // Update failure
    mockVoting.update.mockRejectedValueOnce(new Error('fail'));
    await page.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should handle edit mode transitions and publishing options', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.pageSection = PageSections.START;
    page.enterEditMode();
    expect(page.editMode).toBe(UXMode.EDIT);
    expect(page.pageSection).toBe(PageSections.GENERAL);
    expect(page.trackByProp).toBe('id');

    page.publishingOption = PublishingOptions.PUBLISH;
    page.handleChangeOfPublishingOption();
    expect(page.votingSession.publishedSince).toBeDefined();

    page.publishingOption = PublishingOptions.DRAFT;
    page.handleChangeOfPublishingOption();
    expect(page.votingSession.publishedSince).toBeUndefined();

    // Exit edit mode without changes
    await page.exitEditMode();
    expect(page.editMode).toBe(UXMode.VIEW);

    // Enter edit mode and exit with unsaved changes
    page.enterEditMode();
    page.votingSession.name = 'Different Title';
    let doExit: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doExit = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.exitEditMode();
    expect(doExit).toBeDefined();
    doExit();
    expect(page.editMode).toBe(UXMode.VIEW);
  });

  it('should archive and unarchive session with confirmation alert', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    let doArchive: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await page.archiveSession(true);
    await doArchive();
    expect(mockVoting.archive).toHaveBeenCalled();

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveSession(false);
    await doArchive();
    expect(mockVoting.unarchive).toHaveBeenCalled();

    // Archive error handling
    mockVoting.archive.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveSession(true);
    await doArchive();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should delete and duplicate session with confirmation alerts and handle errors', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteSession();
    await doDelete();
    expect(mockVoting.delete).toHaveBeenCalled();

    // Delete failure
    mockVoting.delete.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.deleteSession();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    let doDuplicate: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateSession();
    await doDuplicate();
    expect(mockVoting.insert).toHaveBeenCalled();

    // Duplicate failure
    mockVoting.insert.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.duplicateSession();
    await doDuplicate();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should add and remove scrutineers', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    let doAdd: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doAdd = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.addScrutineer();
    await doAdd({ userId: '' }); // empty
    await doAdd({ userId: 'u-scrutineer' });
    expect(page.votingSession.scrutineersIds).toContain('u-scrutineer');

    // Duplicate scrutineer
    await doAdd({ userId: 'u-scrutineer' });

    await page.removeScrutineerById('u-scrutineer');
    expect(page.votingSession.scrutineersIds).not.toContain('u-scrutineer');
    await page.removeScrutineerById('non-existent');
  });

  it('should manage and remove ballots', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    let templateButtons: any[] = [];
    mockActionsCtrl.create.mockImplementationOnce(async (opts: any) => {
      templateButtons = opts.buttons;
      return { present: vi.fn() };
    });
    await page.addBallot();
    expect(templateButtons.length).toBeGreaterThan(0);

    // Call blank, yes-no, and candidates handlers
    for (const btn of templateButtons.filter(b => typeof b.handler === 'function')) {
      await btn.handler();
    }
    expect(mockModalCtrl.create).toHaveBeenCalled();

    const ballot = page.votingSession.ballots[0];
    let doRemove: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doRemove = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.removeBallot(ballot);
    doRemove();
    expect(page.votingSession.ballots).not.toContain(ballot);
  });

  it('should test setUIHelpersForComplexFields with ROLL_CALL, IMMEDIATE, and past publishedSince', () => {
    page.votingSession = new VotingSession({
      publishedSince: '2020-01-01T00:00:00.000Z',
      type: VotingSessionTypes.ROLL_CALL,
      voters: [{ id: 'v-1', name: 'Alice' }],
      participantVoters: ['Alice']
    });
    (page as any).setUIHelpersForComplexFields();
    expect(page.publishingOption).toBe(PublishingOptions.PUBLISH);
    expect(page.rollCall['v-1']).toBe(true);

    page.votingSession = new VotingSession({
      publishedSince: '2099-01-01T00:00:00.000Z',
      type: VotingSessionTypes.IMMEDIATE,
      voters: [{ id: 'v-1', name: 'Alice' }]
    });
    page.results = [[{ voters: ['Alice'] } as any]] as any;
    (page as any).setUIHelpersForComplexFields();
    expect(page.publishingOption).toBe(PublishingOptions.SCHEDULE);
  });

  it('should handle voters table and filters', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.initVotersTable();
    expect(page.col.length).toBeGreaterThan(0);

    page.filterVoters('Alice');
    expect(page.filteredVoters?.length).toBe(1);

    page.calcVotersFooterTotals();
    expect(page.totalWeights).toBe(1);

    await page.addVoter();
    expect(mockModalCtrl.create).toHaveBeenCalled();

    await page.actionsOnVoters();
    expect(mockActionsCtrl.create).toHaveBeenCalled();

    page.pageSection = PageSections.VOTERS;
    page.handleChangePageSection();

    page.pageSection = PageSections.ANALYTICS;
    page.votingSession.endsAt = '2026-01-01T12:00:00Z' as any;
    page.votingSession.timezone = 'UTC';
    page.handleChangePageSection();
    expect(page.extendDurationAt).toBe('2026-01-01T12:00:00Z');
    expect(page.extendDurationTimezone).toBe('UTC');

    page.errors.add('name');
    expect(page.hasFieldAnError('name')).toBe(true);
    expect(page.hasFieldAnError('type')).toBe(false);
  });

  it('should configure voters table for started, weighted, and form sessions', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    // Configure as started and weighted
    page.votingSession.startsAt = '2020-01-01T00:00:00.000Z';
    page.votingSession.endsAt = '2099-01-01T00:00:00.000Z';
    page.votingSession.isWeighted = true;
    page.votingTickets = [
      new VotingTicket({ voterId: 'v-1', signedInAt: '2020-01-01T00:01:00.000Z', votedAt: '2020-01-01T00:02:00.000Z' })
    ];

    page.table = { offset: { set: vi.fn() } } as any;
    page.initVotersTable();

    // Verify pipe transformations
    const startedCol = page.col.find(c => c.prop === 'id' && c.name === 'VOTING.STARTED_VOTING');
    expect(startedCol?.pipe?.transform('v-1')).toBe('✔️');
    expect(startedCol?.pipe?.transform('v-unknown')).toBe('');

    const votedCol = page.col.find(c => c.prop === 'id' && c.name === 'VOTING.VOTED');
    expect(votedCol?.pipe?.transform('v-1')).toBe('✔️');
    expect(votedCol?.pipe?.transform('v-unknown')).toBe('');

    // Table height calculations
    page.setVotersTableHeight();
    expect(page.limit).toBeDefined();

    page.setVotersTableHeight({ target: { innerHeight: 800 } } as any);
    expect(page.limit).toBeDefined();

    // Filter with stayInPage = true vs false
    const mockSet = vi.fn();
    page.table = { offset: { set: mockSet } } as any;
    page.filterVoters('test', false);
    expect(mockSet).toHaveBeenCalledWith(0);

    mockSet.mockClear();
    page.filterVoters('test', true);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should detect duplicate voter attributes and missing emails', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.votingSession.voters = [
      new Voter({ id: 'v-1', name: 'Alice', email: 'alice@example.com' }, page.votingSession),
      new Voter({ id: 'v-1', name: 'Alice', email: 'alice@example.com' }, page.votingSession),
      new Voter({ id: 'v-2', name: 'Bob', email: '' }, page.votingSession)
    ];

    expect(page.getVotersDuplicatedIds()).toEqual(['v-1']);
    expect(page.getVotersDuplicatedNames()).toEqual(['alice']);
    expect(page.getVotersDuplicatedEmails()).toEqual(['alice@example.com']);
    expect(page.getNameOfVotersWithoutEmail()).toEqual(['Bob']);

    page.calcVotersFooterTotals();
    expect(page.numDuplicatedNames).toBe(1);
    expect(page.numDuplicatedEmails).toBe(1);
    expect(page.numMissingEmails).toBe(1);
  });

  it('should manage voter modal dismiss actions (add, delete, dismiss without data)', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    const voterToDelete = page.votingSession.voters[0];

    // Dismiss with delete
    let dismissCb: any;
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          dismissCb = cb;
        }
      }))
    }));
    await page.manageVoter(voterToDelete, false);
    dismissCb({ data: { id: 'DELETE' } });
    expect(page.votingSession.voters).not.toContain(voterToDelete);

    // Dismiss with new voter
    const newVoter = new Voter({ id: 'v-new', name: 'Charlie', email: 'charlie@example.com' }, page.votingSession);
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          dismissCb = cb;
        }
      }))
    }));
    await page.manageVoter(newVoter, true);
    dismissCb({ data: { id: 'v-new', name: 'Charlie', email: 'charlie@example.com' } });
    expect(page.votingSession.voters.some(v => v.id === 'v-new')).toBe(true);

    // Dismiss with null data
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          dismissCb = cb;
        }
      }))
    }));
    await page.manageVoter(newVoter, true);
    dismissCb({ data: null });
  });

  it('should handle actionsOnVoters: import, export, and removeAllVoters', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();
    page.editMode = UXMode.EDIT;

    let actionButtons: any[] = [];
    mockActionsCtrl.create.mockImplementationOnce(async (opts: any) => {
      actionButtons = opts.buttons;
      return { present: vi.fn() };
    });
    await page.actionsOnVoters();

    // Export voters
    const exportBtn = actionButtons.find(b => b.text === 'VOTING.EXPORT_VOTERS');
    exportBtn.handler();
    expect(mockVoting.downloadVotersSpreadsheet).toHaveBeenCalled();

    // Import voters
    let importDismissCb: any;
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockImplementation(() => ({
        then: (cb: any) => {
          importDismissCb = cb;
        }
      }))
    }));
    const importBtn = actionButtons.find(b => b.text === 'VOTING.IMPORT_VOTERS');
    await importBtn.handler();
    importDismissCb({ data: [new Voter({ id: 'v-imp', name: 'Imported' }, page.votingSession)] });
    expect(page.votingSession.voters[0].id).toBe('v-imp');

    // Remove all voters
    let removeAllConfirm: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      removeAllConfirm = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    const removeBtn = actionButtons.find(b => b.text === 'VOTING.REMOVE_ALL_VOTERS');
    await removeBtn.handler();
    removeAllConfirm();
    expect(page.votingSession.voters.length).toBe(0);
  });

  it('should check canSessionStart and fill default endsAt and timezone', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.votingSession.publishedSince = '2020-01-01T00:00:00.000Z';
    page.votingSession.endsAt = undefined;
    page.votingSession.timezone = undefined as any;
    const canStart = page.canSessionStart();

    expect(canStart).toBe(true);
    expect(page.votingSession.endsAt).toBeDefined();
    expect(page.votingSession.timezone).toBeDefined();
  });

  it('should start session for form, immediate, and roll call types', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    // Immediate type
    page.votingSession.type = VotingSessionTypes.IMMEDIATE;
    await page.startSession();
    expect(page.pageSection).toBe(PageSections.IMMEDIATE);
    expect(page.immediateInProgress).toBe(true);

    // Roll call type
    page.votingSession.type = VotingSessionTypes.ROLL_CALL;
    await page.startSession();
    expect(page.pageSection).toBe(PageSections.ROLL_CALL);
    expect(page.rollCallInProgress).toBe(true);

    // Form session type with validation error
    page.votingSession.type = VotingSessionTypes.FORM_PUBLIC;
    page.votingSession.name = ''; // Invalid
    await page.startSession();
    expect(mockMessage.warning).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');

    // Valid form session start
    page.votingSession.publishedSince = '2020-01-01T00:00:00.000Z';
    page.votingSession.name = 'Valid Form';
    page.votingSession.endsAt = '2099-01-01T00:00:00.000Z';
    page.votingSession.timezone = 'UTC';

    let doStart: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doStart = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.startSession();
    await doStart();
    expect(mockVoting.start).toHaveBeenCalled();
    expect(page.pageSection).toBe(PageSections.ANALYTICS);
    expect(mockWebSocket.open).toHaveBeenCalled();

    // Form start failure
    mockVoting.start.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doStart = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.startSession();
    await doStart();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should manage duration extension and premature stopping', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    // When session is NOT in progress
    await page.extendDuration();
    await page.stopSessionPrematurely();
    expect(mockAlertCtrl.create).not.toHaveBeenCalled();

    // Set session in progress
    page.votingSession.startsAt = '2020-01-01T00:00:00.000Z';
    page.votingSession.endsAt = '2099-01-01T00:00:00.000Z';
    page.votingSession.timezone = 'UTC';

    // Extend duration with invalid time
    page.extendDurationAt = '2019-01-01T00:00:00.000Z';
    await page.extendDuration();
    expect(mockMessage.warning).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');

    // Extend duration with valid time
    page.extendDurationAt = '2099-01-02T00:00:00.000Z';
    page.extendDurationTimezone = 'Europe/Rome';
    let doConfirm: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doConfirm = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.extendDuration();
    await doConfirm();
    expect(mockVoting.extendDuration).toHaveBeenCalled();

    // Extend duration failure
    mockVoting.extendDuration.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doConfirm = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.extendDuration();
    await doConfirm();
    expect(mockMessage.error).toHaveBeenCalled();

    // Stop session prematurely
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doConfirm = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.stopSessionPrematurely();
    await doConfirm();
    expect(mockVoting.stopPrematurely).toHaveBeenCalled();

    // Stop session error
    mockVoting.stopPrematurely.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doConfirm = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.stopSessionPrematurely();
    await doConfirm();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should handle websocket messages and voter attendance analytics', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.votingSession.startsAt = '2020-01-01T00:00:00.000Z';
    page.votingSession.endsAt = '2099-01-01T00:00:00.000Z';
    page.votingSession.voters = [
      new Voter({ id: 'v-1', name: 'Alice' }, page.votingSession),
      new Voter({ id: 'v-2', name: 'Bob' }, page.votingSession)
    ];
    page.votingTickets = [
      new VotingTicket({ voterId: 'v-1' }),
      new VotingTicket({ voterId: 'v-2' })
    ];

    expect(page.getNumVotersWhoSignedIn()).toBe(0);
    expect(page.getNumVotersWhoVoted()).toBe(0);

    // Simulate websocket message reception
    let wsOnMessage: any;
    mockWebSocket.open.mockImplementationOnce((config: any) => {
      wsOnMessage = config.onMessage;
    });
    (page as any).openWebSocketForVotingTicketsStatus();

    // Message for voter 1
    wsOnMessage({
      item: { voterId: 'v-1', signedInAt: '2020-01-01T00:01:00.000Z', votedAt: '2020-01-01T00:02:00.000Z' }
    });

    expect(page.getNumVotersWhoSignedIn()).toBe(1);
    expect(page.getNumVotersWhoVoted()).toBe(1);

    // Message for voter 2 (all voted -> triggers early end check)
    wsOnMessage({
      item: { voterId: 'v-2', signedInAt: '2020-01-01T00:01:00.000Z', votedAt: '2020-01-01T00:02:00.000Z' }
    });
    expect(mockVoting.checkWhetherSessionShouldEndEarly).toHaveBeenCalled();
  });

  it('should show, publish, and download results and voters audit', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    // Session has not ended
    page.votingSession.startsAt = '2020-01-01T00:00:00.000Z';
    page.votingSession.endsAt = '2099-01-01T00:00:00.000Z';
    await page.showResults();
    expect(mockVoting.getVotesBeforeTheyArePublished).not.toHaveBeenCalled();

    // Session has ended
    page.votingSession.endsAt = '2020-01-02T00:00:00.000Z';
    await page.showResults();
    expect(mockVoting.getVotesBeforeTheyArePublished).toHaveBeenCalled();
    expect(page.results).toBeDefined();

    // Download results
    page.downloadResults();
    expect(mockVoting.downloadResultsSpreadsheet).toHaveBeenCalled();

    // Download results when results is undefined
    page.results = undefined;
    page.downloadResults();

    // Show results error handling
    mockVoting.getVotesBeforeTheyArePublished.mockRejectedValueOnce(new Error('fail'));
    await page.showResults();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // Publish results
    let doPublish: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doPublish = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.publishResults();
    await doPublish();
    expect(mockVoting.publishVotingFormResults).toHaveBeenCalled();

    // Publish results failure
    mockVoting.publishVotingFormResults.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doPublish = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.publishResults();
    await doPublish();
    expect(mockMessage.error).toHaveBeenCalled();

    // Download voters audit
    page.votingTickets = undefined;
    page.downloadVotersAudit();

    page.votingTickets = [new VotingTicket({ voterId: 'v-1' })];
    page.downloadVotersAudit();
    expect(mockVoting.downloadVotersAuditSpreadsheet).toHaveBeenCalled();
  });

  it('should handle immediate voting workflow: ballots, participants, save, and cancel', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.votingSession.type = VotingSessionTypes.IMMEDIATE;
    page.votingSession.ballots = [
      new VotingBallot({ text: 'Ballot 1', options: ['Yes', 'No'] })
    ];
    page.votingSession.voters = [
      new Voter({ id: 'v-1', name: 'Alice', voteWeight: 2 }, page.votingSession),
      new Voter({ id: 'v-2', name: 'Bob', voteWeight: 1 }, page.votingSession)
    ];

    // Configure immediate choices: Alice voted Yes (index 0), Bob is absent (index 2)
    const ballotMap = page.getImmediateOfBallot(0);
    ballotMap['v-1'] = 0;
    ballotMap['v-2'] = 2; // options.length is 2, so absentIndex is 3. 2 is Abstain.
    expect(page.getNumVotersPresentToImmediateBallotByIndex(0)).toBe(2);

    const { results, participantVoters } = page.getResultsAndParticipantsFromImmediate();
    expect(participantVoters).toContain('Alice');
    expect(participantVoters).toContain('Bob');
    expect(results[0][0].value).toBeGreaterThan(0);

    // setImmediateFromResults
    page.setImmediateFromResults(results);
    expect(page.getImmediateOfBallot(0)['v-1']).toBe(0);

    // setImmediateFromResults undefined
    page.setImmediateFromResults(undefined);
    expect(page.immediateByBallot.length).toBe(0);

    // Cancel immediate
    let doCancel: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doCancel = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.cancelImmediate();
    doCancel();
    expect(page.immediateInProgress).toBe(false);

    // Save immediate with publish = false and nextIndex
    let doSave: any;
    page.immediateAccordion = { value: '0' } as any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSave = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.saveImmediate(false, 1);
    await doSave();
    expect(mockVoting.setImmediateResults).toHaveBeenCalled();
    expect(page.immediateAccordion?.value).toBe('1');

    // Save immediate with publish = true
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSave = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.saveImmediate(true);
    await doSave();
    expect(mockVoting.setImmediateResults).toHaveBeenCalled();

    // Save immediate failure
    mockVoting.setImmediateResults.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSave = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.saveImmediate(true);
    await doSave();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should handle roll call workflow: attendance, results, save, and cancel', async () => {
    page.sessionId = 's-1' as any;
    await page.ionViewWillEnter();

    page.votingSession.type = VotingSessionTypes.ROLL_CALL;
    page.votingSession.ballots = [
      new VotingBallot({ text: 'Roll Call', options: ['Present'] })
    ];
    page.votingSession.voters = [
      new Voter({ id: 'v-1', name: 'Alice' }, page.votingSession),
      new Voter({ id: 'v-2', name: 'Bob' }, page.votingSession)
    ];

    page.rollCall = { 'v-1': true };
    expect(page.getNumVotersPresentToRollCall()).toBe(1);

    const { results, participantVoters } = page.getResultsAndParticipantsFromRollCall();
    expect(participantVoters).toEqual(['Alice']);
    expect(results[0][0].value).toBe(0.5);

    page.setRollCallFromParticipantVoters(['Bob']);
    expect(page.rollCall['v-2']).toBe(true);
    expect(page.rollCall['v-1']).toBeUndefined();

    // Cancel roll call
    let doCancel: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doCancel = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.cancelRollCall();
    doCancel();
    expect(page.rollCallInProgress).toBe(false);

    // Save roll call
    let doSave: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSave = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.saveRollCall(true);
    await doSave();
    expect(mockVoting.setImmediateResults).toHaveBeenCalled();
    expect(page.rollCallInProgress).toBe(false);

    // Save roll call failure
    mockVoting.setImmediateResults.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSave = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await page.saveRollCall(true);
    await doSave();
    expect(mockMessage.error).toHaveBeenCalled();
  });
});
