import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionsService } from '@tabs/topics/questions/questions.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let mockApi: Partial<IDEAApiService>;
  let mockApp: any;
  const mockTopic = new Topic({ topicId: 'top-1' });

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      patchResource: vi.fn(),
      deleteResource: vi.fn()
    };
    mockApp = {
      user: { userId: 'u-1' }
    };
    service = new QuestionsService(mockApi as IDEAApiService, mockApp);
  });

  it('should load and filter questions of topic', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { questionId: 'q-1', summary: 'Financial budget', creator: { name: 'Alice' } },
      { questionId: 'q-2', summary: 'Statutes change', creator: { name: 'Bob' } }
    ]);

    const all = await service.getListOfTopic(mockTopic, { force: true });
    expect(all?.length).toBe(2);

    const filtered = await service.getListOfTopic(mockTopic, { search: 'budget' });
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].questionId).toBe('q-1');
  });

  it('should insert, update, upvote, get claps, and delete question', async () => {
    const q = new Question({ questionId: 'q-1' });
    (mockApi.getResource as any).mockResolvedValue(q);
    (mockApi.postResource as any).mockResolvedValue(q);
    (mockApi.putResource as any).mockResolvedValue(q);

    const fetched = await service.getById(mockTopic, 'q-1');
    expect(fetched.questionId).toBe('q-1');

    const inserted = await service.insert(mockTopic, q);
    expect(inserted.questionId).toBe('q-1');

    const updated = await service.update(mockTopic, q);
    expect(updated.questionId).toBe('q-1');

    await service.upvote(mockTopic, q);
    expect(mockApi.postResource).toHaveBeenCalledWith(['topics', 'top-1', 'questions', 'q-1', 'upvotes']);

    await service.upvoteCancel(mockTopic, q);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['topics', 'top-1', 'questions', 'q-1', 'upvotes']);

    (mockApi.patchResource as any).mockResolvedValue(['ans-1', 'ans-2']);
    const claps = await service.userClaps(mockTopic, q);
    expect(claps).toEqual({ 'ans-1': true, 'ans-2': true });

    (mockApi.getResource as any).mockResolvedValueOnce({ upvoted: true });
    const hasUpvoted = await service.userHasUpvoted(mockTopic, q);
    expect(hasUpvoted).toBe(true);

    (mockApi.getResource as any).mockResolvedValueOnce([{ id: 'u-1', name: 'Alice' }]);
    const upvoters = await service.getUpvoters(mockTopic, q);
    expect(upvoters).toHaveLength(1);
    expect(upvoters[0].name).toBe('Alice');

    await service.delete(mockTopic, q);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['topics', 'top-1', 'questions', 'q-1']);
  });

  it('should paginate questions when count exceeds MAX_PAGE_SIZE', async () => {
    const manyQuestions = Array.from({ length: 30 }, (_, i) => ({
      questionId: `q-${i}`,
      summary: `Question summary ${i}`,
      creator: { name: `User ${i}`, section: `Section ${i}`, country: `Country ${i}` }
    }));
    (mockApi.getResource as any).mockResolvedValue(manyQuestions);

    const paginatedWithId = await service.getListOfTopic(mockTopic, {
      force: true,
      withPagination: true,
      startPaginationAfterId: 'q-5'
    });
    expect(paginatedWithId!.length).toBe(5 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getListOfTopic(mockTopic, {
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);
  });
});
