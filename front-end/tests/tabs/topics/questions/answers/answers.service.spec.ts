import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnswersService } from '@tabs/topics/questions/answers/answers.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Question } from '@models/question.model';
import { Answer } from '@models/answer.model';

describe('AnswersService', () => {
  let service: AnswersService;
  let mockApi: Partial<IDEAApiService>;
  let mockApp: any;
  const mockQuestion = new Question({ questionId: 'q-1', topicId: 'top-1' });

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      deleteResource: vi.fn()
    };
    mockApp = {
      user: { userId: 'u-1' }
    };
    service = new AnswersService(mockApi as IDEAApiService, mockApp);
  });

  it('should load and filter answers of question', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { answerId: 'ans-1', text: 'This is the clear answer', creator: { name: 'Alice' } },
      { answerId: 'ans-2', text: 'Another perspective', creator: { name: 'Bob' } }
    ]);

    const all = await service.getListOfQuestion(mockQuestion, { force: true });
    expect(all?.length).toBe(2);

    const filtered = await service.getListOfQuestion(mockQuestion, { search: 'clear' });
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].answerId).toBe('ans-1');
  });

  it('should getById, insert, update, delete, and clap answer', async () => {
    const ans = new Answer({ answerId: 'ans-1', text: 'Answer' });
    (mockApi.getResource as any).mockResolvedValue(ans);
    (mockApi.postResource as any).mockResolvedValue(ans);
    (mockApi.putResource as any).mockResolvedValue(ans);

    const fetched = await service.getById(mockQuestion, 'ans-1');
    expect(fetched.answerId).toBe('ans-1');

    const inserted = await service.insert(mockQuestion, ans);
    expect(inserted.answerId).toBe('ans-1');

    const updated = await service.update(mockQuestion, ans);
    expect(updated.answerId).toBe('ans-1');

    await service.clap(mockQuestion, ans);
    expect(mockApi.postResource).toHaveBeenCalledWith([
      'topics', 'top-1', 'questions', 'q-1', 'answers', 'ans-1', 'claps'
    ]);

    await service.clapCancel(mockQuestion, ans);
    expect(mockApi.deleteResource).toHaveBeenCalledWith([
      'topics', 'top-1', 'questions', 'q-1', 'answers', 'ans-1', 'claps'
    ]);

    (mockApi.getResource as any).mockResolvedValue({ clapped: true });
    const hasClapped = await service.userHasClapped(mockQuestion, ans);
    expect(hasClapped).toBe(true);

    (mockApi.getResource as any).mockResolvedValueOnce([{ id: 'u-clapper', name: 'Clapper' }]);
    const clappers = await service.getClappers(mockQuestion, ans);
    expect(clappers).toHaveLength(1);
    expect(clappers[0].name).toBe('Clapper');

    await service.delete(mockQuestion, ans);
    expect(mockApi.deleteResource).toHaveBeenCalledWith([
      'topics', 'top-1', 'questions', 'q-1', 'answers', 'ans-1'
    ]);
  });

  it('should paginate answers when count exceeds MAX_PAGE_SIZE', async () => {
    const manyAnswers = Array.from({ length: 30 }, (_, i) => ({
      answerId: `ans-${i}`,
      text: `Answer text ${i}`,
      creator: { name: `User ${i}`, section: `Section ${i}`, country: `Country ${i}` }
    }));
    (mockApi.getResource as any).mockResolvedValue(manyAnswers);

    const paginatedWithId = await service.getListOfQuestion(mockQuestion, {
      force: true,
      withPagination: true,
      startPaginationAfterId: 'ans-5'
    });
    expect(paginatedWithId!.length).toBe(5 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getListOfQuestion(mockQuestion, {
      withPagination: true
    });
    expect(paginatedWithoutId!.length).toBe(service.MAX_PAGE_SIZE);
  });
});
