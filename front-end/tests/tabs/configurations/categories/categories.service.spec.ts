import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopicCategoryService } from '@tabs/configurations/categories/categories.service';
import { IDEAApiService } from '@idea-ionic/common';
import { TopicCategory } from '@models/category.model';

describe('TopicCategoryService', () => {
  let service: TopicCategoryService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      patchResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new TopicCategoryService(mockApi as IDEAApiService);
  });

  it('should load, cache, and filter list by search query', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { categoryId: 'cat-1', name: 'Workshops' },
      { categoryId: 'cat-2', name: 'Plenaries' }
    ]);

    const list1 = await service.getList({ search: 'work', all: false });
    expect(list1?.length).toBe(1);
    expect(list1?.[0].name).toBe('Workshops');
    expect(mockApi.getResource).toHaveBeenCalledWith('categories', { params: {} });

    // Should use cached list without reloading API
    const list2 = await service.getList({ search: 'plen', all: false });
    expect(list2?.length).toBe(1);
    expect(mockApi.getResource).toHaveBeenCalledTimes(1);
  });

  it('should paginate when list exceeds MAX_PAGE_SIZE', async () => {
    const rawCategories = Array.from({ length: 30 }, (_, i) => ({
      categoryId: `cat-${i}`,
      name: `Category ${i}`
    }));
    (mockApi.getResource as any).mockResolvedValue(rawCategories);

    const page1 = await service.getList({ withPagination: true });
    expect(page1?.length).toBe(24);

    const page2 = await service.getList({ withPagination: true, startPaginationAfterId: 'cat-5' });
    expect(page2?.length).toBe(29);
  });

  it('should CRUD categories', async () => {
    const cat = new TopicCategory({ categoryId: 'cat-1', name: 'Test' });
    (mockApi.getResource as any).mockResolvedValue(cat);
    (mockApi.postResource as any).mockResolvedValue(cat);
    (mockApi.putResource as any).mockResolvedValue(cat);

    const fetched = await service.getById('cat-1');
    expect(fetched.categoryId).toBe('cat-1');

    const inserted = await service.insert(cat);
    expect(inserted.name).toBe('Test');

    const updated = await service.update(cat);
    expect(updated.name).toBe('Test');

    await service.archive(cat);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['categories', 'cat-1'], { body: { action: 'ARCHIVE' } });

    await service.unarchive(cat);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['categories', 'cat-1'], { body: { action: 'UNARCHIVE' } });

    await service.delete(cat);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['categories', 'cat-1']);
  });
});
