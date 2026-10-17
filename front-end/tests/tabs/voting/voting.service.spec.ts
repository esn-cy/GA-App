import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VotingService, VotingSessionsSortBy } from '@tabs/voting/voting.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Voter, VotingSession, VotingSessionTypes } from '@models/votingSession.model';
import { VotingTicket } from '@models/votingTicket.model';

describe('VotingService', () => {
  let service: VotingService;
  let mockApi: Partial<IDEAApiService>;

  const mockSessionsData: Partial<VotingSession>[] = [
    {
      sessionId: 'session-1',
      name: 'Approval of Agenda',
      description: 'Vote on the preliminary agenda',
      event: { eventId: 'event-oct', name: 'October GA 2026' } as any,
      createdAt: '2026-10-01T09:00:00.000Z',
      archivedAt: undefined,
      ballots: [{ text: 'Ballot 1', options: ['Yes', 'No'] }] as any,
      voters: [{ id: 'v-1', name: 'Alice', email: 'alice@example.com', voteWeight: 2 }] as any
    },
    {
      sessionId: 'session-2',
      name: 'Board Elections',
      description: 'Election of the new executive board',
      event: { eventId: 'event-oct', name: 'October GA 2026' } as any,
      createdAt: '2026-10-02T15:00:00.000Z',
      archivedAt: undefined,
      ballots: [],
      voters: []
    }
  ];

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn().mockResolvedValue(mockSessionsData),
      postResource: vi.fn().mockResolvedValue(mockSessionsData[0]),
      putResource: vi.fn().mockResolvedValue(mockSessionsData[0]),
      patchResource: vi.fn().mockResolvedValue(mockSessionsData[0]),
      deleteResource: vi.fn().mockResolvedValue(undefined)
    };
    service = new VotingService(mockApi as IDEAApiService);
  });

  it('should load active voting sessions from API and sort/paginate', async () => {
    const sessions = await service.getActiveList({ force: true, sortBy: VotingSessionsSortBy.CREATED_DATE_DESC });
    expect(mockApi.getResource).toHaveBeenCalledWith('voting-sessions', { params: { archived: false } });
    expect(sessions).toHaveLength(2);

    const asc = await service.getActiveList({ sortBy: VotingSessionsSortBy.CREATED_DATE_ASC });
    expect(asc![0].sessionId).toBe('session-1');

    const searchMatch = await service.getActiveList({ search: 'Approval Agenda' });
    expect(searchMatch).toHaveLength(1);

    const eventMatch = await service.getActiveList({ eventId: 'event-oct' });
    expect(eventMatch).toHaveLength(2);

    // Test with > 24 sessions to test pagination
    const manySessions = Array.from({ length: 30 }, (_, i) => ({
      sessionId: `s-${i}`,
      name: `Session ${i}`,
      description: `Desc ${i}`,
      createdAt: `2026-10-${String((i % 25) + 1).padStart(2, '0')}`
    }));
    (mockApi.getResource as any).mockResolvedValueOnce(manySessions);
    const paginatedWithId = await service.getActiveList({
      force: true,
      withPagination: true,
      startPaginationAfterId: 's-5'
    });
    expect(paginatedWithId!.length).toBe(5 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getActiveList({
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);
  });

  it('should get archived list with options', async () => {
    const archivedData = Array.from({ length: 30 }, (_, i) => ({
      sessionId: `a-${i}`,
      name: `Archived ${i}`,
      createdAt: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      ballots: [],
      voters: []
    }));
    (mockApi.getResource as any).mockResolvedValueOnce(archivedData);

    const archived = await service.getArchivedList({
      force: true,
      eventId: 'ev-1',
      sortBy: VotingSessionsSortBy.CREATED_DATE_ASC,
      withPagination: true,
      startPaginationAfterId: 'a-2'
    });
    expect(archived!.length).toBe(2 + service.MAX_PAGE_SIZE);
    expect(mockApi.getResource).toHaveBeenCalledWith('voting-sessions', {
      params: {
        archived: true,
        eventId: 'ev-1'
      }
    });

    const paginatedWithoutId = await service.getArchivedList({
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);

    const archivedDesc = await service.getArchivedList({ sortBy: VotingSessionsSortBy.CREATED_DATE_DESC });
    expect(archivedDesc).toBeDefined();
  });

  it('should perform CRUD operations', async () => {
    const session = new VotingSession({ sessionId: 'session-1', name: 'Session' });

    (mockApi.getResource as any).mockResolvedValueOnce(mockSessionsData[0]);
    const fetched = await service.getById('session-1');
    expect(fetched.sessionId).toBe('session-1');

    const inserted = await service.insert(session);
    expect(inserted.sessionId).toBe('session-1');

    const updated = await service.update(session);
    expect(updated.sessionId).toBe('session-1');

    await service.archive(session);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['voting-sessions', 'session-1'], { body: { action: 'ARCHIVE' } });

    await service.unarchive(session);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['voting-sessions', 'session-1'], { body: { action: 'UNARCHIVE' } });

    await service.delete(session);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['voting-sessions', 'session-1']);
  });

  it('should handle voting execution and state management', async () => {
    const session = new VotingSession({ sessionId: 'session-1', endsAt: '2026-10-10T12:00:00.000Z', timezone: 'UTC' });
    const voter = new Voter({ id: 'v-1', name: 'Alice' }, session);

    await service.start(session);
    expect(mockApi.patchResource).toHaveBeenCalled();

    (mockApi.getResource as any).mockResolvedValueOnce({ votingSession: session, votingTicket: { ticketId: 't-1' } });
    const voteData = await service.beginVote('session-1', 'v-1', 'token-123');
    expect(voteData.votingSession).toBeDefined();

    const ticket = new VotingTicket({ sessionId: 'session-1', ticketId: 't-1' });
    await service.submitVotes(ticket, [0, 1]);
    expect(mockApi.postResource).toHaveBeenCalled();

    (mockApi.patchResource as any).mockResolvedValueOnce([{ ticketId: 't-1' }]);
    const tickets = await service.getVotingTicketsStatus(session);
    expect(tickets).toHaveLength(1);

    await service.extendDuration(session);
    await service.stopPrematurely(session);
    await service.resendVotingTicketToVoter(session, voter, 'new@example.com');

    (mockApi.patchResource as any).mockResolvedValueOnce({ token: 'tok-abc' });
    const token = await service.getVotingTokenOfVoter(session, voter);
    expect(token).toBe('tok-abc');

    await service.checkWhetherSessionShouldEndEarly(session);
    await service.getVotesBeforeTheyArePublished(session);
    await service.publishVotingFormResults(session);
    await service.setImmediateResults(session, true);
  });

  it('should download spreadsheets', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const secretSession = new VotingSession({
      sessionId: 's-sec',
      name: 'Secret Session',
      type: VotingSessionTypes.FORM_SECRET,
      startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2020-01-01T01:00:00.000Z',
      ballots: [{ text: 'Ballot 1', options: ['Yes', 'No'] }],
      results: { 0: [{ value: 5 }, { value: 2 }, { value: 1 }, { value: 0 }] } as any
    });

    service.downloadResultsSpreadsheet('results.xlsx', secretSession);
    expect(appendSpy).toHaveBeenCalled();

    const publicSession = new VotingSession({
      sessionId: 's-pub',
      name: 'Public Session',
      type: VotingSessionTypes.FORM_PUBLIC,
      startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2020-01-01T01:00:00.000Z',
      ballots: [{ text: 'Ballot 1', options: ['Yes', 'No'] }],
      voters: [{ id: 'v-1', name: 'Alice' }, { id: 'v-2', name: 'Bob' }, { id: 'v-3', name: 'Charlie' }],
      results: {
        0: [{ option: 'Yes', voters: ['Alice'] }, { option: 'No', voters: [] }, {
          option: 'Abstain',
          voters: ['Bob']
        }]
      } as any
    });
    service.downloadResultsSpreadsheet('public_results.xlsx', publicSession);

    // Empty results check
    const emptySession = new VotingSession({ sessionId: 's-empty' });
    service.downloadResultsSpreadsheet('empty.xlsx', emptySession);

    // Voters spreadsheet
    service.downloadVotersSpreadsheet('empty.xlsx', emptySession);

    const formWeightedSession = new VotingSession({
      sessionId: 's-weight',
      type: VotingSessionTypes.FORM_PUBLIC,
      isWeighted: true,
      voters: [{ id: 'v-1', name: 'Alice', email: 'alice@example.com', voteWeight: 3 }]
    });
    service.downloadVotersSpreadsheet('voters.xlsx', formWeightedSession);

    // Voters audit spreadsheet with fraud detection
    const tickets = [
      new VotingTicket({
        voterName: 'Alice',
        voterId: 'v-1',
        ipAddress: '1.2.3.4',
        userAgent: 'Chrome',
        votedAt: '2026-10-01'
      }),
      new VotingTicket({
        voterName: 'Bob',
        voterId: 'v-2',
        ipAddress: '1.2.3.4',
        userAgent: 'Chrome',
        votedAt: '2026-10-01'
      }),
      new VotingTicket({ voterName: 'Charlie', voterId: 'v-3', ipAddress: '-', userAgent: '-' })
    ];
    service.downloadVotersAuditSpreadsheet('audit.xlsx', tickets);
    service.downloadVotersAuditSpreadsheet('empty.xlsx', null as any);
  });
});
