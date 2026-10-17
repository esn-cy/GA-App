import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesService, MessagesSortBy } from '@tabs/topics/messages/messages.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Topic } from '@models/topic.model';
import { Message, MessageTypes } from '@models/message.model';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockApi: Partial<IDEAApiService>;
  let mockApp: any;
  const mockTopic = new Topic({ topicId: 'top-1' });

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      patchResource: vi.fn(),
      deleteResource: vi.fn()
    };
    mockApp = {
      user: { userId: 'u-1' }
    };
    service = new MessagesService(mockApi as IDEAApiService, mockApp);
  });

  it('should load, filter, and sort messages of topic', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { messageId: 'm-1', summary: 'Question about agenda', numOfUpvotes: 5, type: MessageTypes.QUESTION },
      { messageId: 'm-2', summary: 'Appreciation shared', numOfUpvotes: 10, type: MessageTypes.APPRECIATION }
    ]);

    const all = await service.getListOfTopic(mockTopic, { force: true });
    expect(all?.length).toBe(2);

    const filtered = await service.getListOfTopic(mockTopic, { filterByType: MessageTypes.QUESTION });
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].messageId).toBe('m-1');

    const sorted = await service.getListOfTopic(mockTopic, { sortBy: MessagesSortBy.UPVOTES_DESC });
    expect(sorted?.[0].messageId).toBe('m-2');

    // Test different sort options
    const sortedCreationAsc = await service.getListOfTopic(mockTopic, { sortBy: MessagesSortBy.CREATION_ASC });
    expect(sortedCreationAsc?.[0].messageId).toBe('m-1');

    const sortedCreationDesc = await service.getListOfTopic(mockTopic, { sortBy: MessagesSortBy.CREATION_DESC });
    expect(sortedCreationDesc?.[0].messageId).toBe('m-2');

    const sortedUpvotesAsc = await service.getListOfTopic(mockTopic, { sortBy: MessagesSortBy.UPVOTES_ASC });
    expect(sortedUpvotesAsc?.[0].messageId).toBe('m-1');

    // Search filter across text and creator
    (mockApi.getResource as any).mockResolvedValue([
      {
        messageId: 'm-3',
        summary: 'Discussion',
        text: 'Important text',
        creator: { name: 'Bob', section: 'SecA', country: 'France' }
      }
    ]);
    const searchByName = await service.getListOfTopic(mockTopic, { force: true, search: 'Bob' });
    expect(searchByName?.length).toBe(1);

    const searchByCountry = await service.getListOfTopic(mockTopic, { search: 'France' });
    expect(searchByCountry?.length).toBe(1);

    const searchMismatch = await service.getListOfTopic(mockTopic, { search: 'NonExistent' });
    expect(searchMismatch?.length).toBe(0);

    // Completed filter
    (mockApi.getResource as any).mockResolvedValue([
      { messageId: 'm-4', summary: 'Active' },
      { messageId: 'm-5', summary: 'Done', completedAt: '2020-01-01T00:00:00.000Z' }
    ]);
    const withoutCompleted = await service.getListOfTopic(mockTopic, { force: true, showCompleted: false });
    expect(withoutCompleted?.length).toBe(1);
    expect(withoutCompleted?.[0].messageId).toBe('m-4');

    const withCompleted = await service.getListOfTopic(mockTopic, { showCompleted: true });
    expect(withCompleted?.length).toBe(2);

    // Pagination
    service.MAX_PAGE_SIZE = 2;
    (mockApi.getResource as any).mockResolvedValue([
      { messageId: 'm-1' },
      { messageId: 'm-2' },
      { messageId: 'm-3' },
      { messageId: 'm-4' }
    ]);
    const paged = await service.getListOfTopic(mockTopic, { force: true, withPagination: true });
    expect(paged?.length).toBe(2);

    const pagedAfter = await service.getListOfTopic(mockTopic, { withPagination: true, startPaginationAfterId: 'm-2' });
    expect(pagedAfter?.length).toBe(3);
  });

  it('should insert, upvote, complete, and delete message', async () => {
    const msg = new Message({ messageId: 'm-1' });
    (mockApi.postResource as any).mockResolvedValue(msg);
    (mockApi.patchResource as any).mockResolvedValue(msg);
    (mockApi.getResource as any).mockResolvedValue({ upvoted: true });

    const inserted = await service.insert(mockTopic, msg);
    expect(inserted.messageId).toBe('m-1');

    const insertedAnon = await service.insertAnonymous(mockTopic, msg);
    expect(insertedAnon.messageId).toBe('m-1');

    await service.upvote(mockTopic, msg);
    expect(mockApi.postResource).toHaveBeenCalledWith(['topics', 'top-1', 'messages', 'm-1', 'upvotes']);

    await service.upvoteCancel(mockTopic, msg);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['topics', 'top-1', 'messages', 'm-1', 'upvotes']);

    const hasUpvoted = await service.userHasUpvoted(mockTopic, msg);
    expect(hasUpvoted).toBe(true);

    (mockApi.getResource as any).mockResolvedValue([{ name: 'Alice' }]);
    const upvoters = await service.getUpvoters(mockTopic, msg);
    expect(upvoters.length).toBe(1);
    expect(upvoters[0].name).toBe('Alice');

    await service.markComplete(mockTopic, msg);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['topics', 'top-1', 'messages', 'm-1'], {
      body: { action: 'MARK_COMPLETE' }
    });

    await service.undoComplete(mockTopic, msg);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['topics', 'top-1', 'messages', 'm-1'], {
      body: { action: 'UNDO_COMPLETE' }
    });

    await service.delete(mockTopic, msg);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['topics', 'top-1', 'messages', 'm-1']);
  });

  it('should handle websocket real-time updates and edge cases', async () => {
    // When messages array is undefined
    service.webSocketUpdate(new Message({ messageId: 'm-none' }));
    service.webSocketRemoveById('m-none');

    (mockApi.getResource as any).mockResolvedValue([
      { messageId: 'm-1', summary: 'Old' }
    ]);
    await service.getListOfTopic(mockTopic, { force: true });

    service.webSocketAdd(new Message({ messageId: 'm-2', summary: 'New' }));
    let list = await service.getListOfTopic(mockTopic);
    expect(list?.length).toBe(2);

    service.webSocketUpdate(new Message({ messageId: 'm-1', summary: 'Updated' }));
    list = await service.getListOfTopic(mockTopic);
    expect(list?.find(x => x.messageId === 'm-1')?.summary).toBe('Updated');

    // Updating non-existing item
    service.webSocketUpdate(new Message({ messageId: 'm-nonexistent', summary: 'Ignored' }));

    // Removing non-existing item
    service.webSocketRemoveById('m-nonexistent');

    service.webSocketRemoveById('m-2');
    list = await service.getListOfTopic(mockTopic);
    expect(list?.length).toBe(1);
  });
});
