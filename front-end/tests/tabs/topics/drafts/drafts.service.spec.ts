import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserDraftsService } from '@tabs/topics/drafts/drafts.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';
import { UserDraft } from '@models/userDraft.model';

describe('UserDraftsService', () => {
  let service: UserDraftsService;
  let mockApi: Partial<IDEAApiService>;

  const ISO_DATE_1 = '2025-01-01T00:00:00.000Z';
  const ISO_DATE_2 = '2025-01-02T00:00:00.000Z';

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new UserDraftsService(mockApi as IDEAApiService);
  });

  it('should get questions drafts of a topic', async () => {
    const topic = new Topic({ topicId: 'top-1' });
    (mockApi.getResource as any).mockResolvedValue([{ draftId: ISO_DATE_1, topicId: 'top-1' }]);

    const drafts = await service.getQuestionsOfTopic(topic);
    expect(drafts.length).toBe(1);
    expect(drafts[0].draftId).toBe(ISO_DATE_1);
    expect(mockApi.getResource).toHaveBeenCalledWith('drafts', { params: { topicId: 'top-1' } });
  });

  it('should get answer draft of a question', async () => {
    const question = new Question({ questionId: 'q-1' });
    (mockApi.getResource as any).mockResolvedValue([{ draftId: ISO_DATE_2, questionId: 'q-1' }]);

    const draft = await service.getAnswerOfQuestion(question);
    expect(draft?.draftId).toBe(ISO_DATE_2);
    expect(mockApi.getResource).toHaveBeenCalledWith('drafts', { params: { questionId: 'q-1' } });
  });

  it('should get, insert, update, and delete draft', async () => {
    const draft = new UserDraft({ draftId: ISO_DATE_1, text: 'Draft text' });
    (mockApi.getResource as any).mockResolvedValue(draft);
    (mockApi.postResource as any).mockResolvedValue(draft);
    (mockApi.putResource as any).mockResolvedValue(draft);

    const fetched = await service.getById(ISO_DATE_1);
    expect(fetched.draftId).toBe(ISO_DATE_1);

    const inserted = await service.insert(draft);
    expect(inserted.draftId).toBe(ISO_DATE_1);

    const updated = await service.update(draft);
    expect(updated.draftId).toBe(ISO_DATE_1);

    await service.delete(draft);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['drafts', ISO_DATE_1]);
  });
});
